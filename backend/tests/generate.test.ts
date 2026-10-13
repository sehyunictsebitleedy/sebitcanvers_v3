import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { generate, openAIProvider, ApiError } from "../src/generate";
import { createApi } from "../src/server";
import { defaultOptions } from "../../sebitcanvers_v3/frontend/src/create/contracts";
import { createSample } from "../../sebitcanvers_v3/frontend/src/dashboard/samples";

test('invalid input is 400, provider timeout is 504 and a timed out slot can be retried', async () => {
  const config={key:'test',model:'test',origin:'http://localhost:5173',timeout:50,rateLimit:10,concurrency:1,maintenance:false};
  const server=createApi(config,async(_prompt,signal)=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true})));
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const url=`http://127.0.0.1:${(server.address() as {port:number}).port}/api/generate`;
  const post=(value:unknown)=>fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(value)});
  try {
    assert.equal((await post({...defaultOptions(),type:2})).status,400);
    assert.equal((await post(defaultOptions())).status,504);
    assert.equal((await post(defaultOptions())).status,504);
  } finally {server.close();server.closeAllConnections();}
});

test("generation validates, repairs once, preserves options and server identity", async () => {
  let calls = 0;
  const options = defaultOptions();
  options.additionalRequest = "학교 운영 현황";
  const sample = createSample();
  sample.header.title = "학교 운영 현황";
  const result = await generate(
    options,
    async (prompt) => {
      assert.ok(prompt.includes("학교 운영 현황"));
      calls++;
      return calls === 1 ? "invalid" : JSON.stringify(sample);
    },
    new AbortController().signal,
  );
  assert.equal(calls, 2);
  assert.equal(result.repaired, true);
  assert.equal(result.schema.header.title, "학교 운영 현황");
  assert.notEqual(result.schema.project.id, sample.project.id);
  assert.equal(result.schema.theme.preset, "modern");
  assert.equal(
    result.schema.settings.selections?.additionalRequest,
    options.additionalRequest,
  );
});
test("invalid final output, CRM and incompatible component selection are rejected", async () => {
  let calls = 0;
  await assert.rejects(
    generate(
      defaultOptions(),
      async () => {
        calls++;
        return "{}";
      },
      new AbortController().signal,
    ),
    /자동 복구/,
  );
  assert.equal(calls, 2);
  await assert.rejects(
    generate(
      { ...defaultOptions(), type: 2 },
      async () => {
        throw Error("must not call");
      },
      new AbortController().signal,
    ),
  );
  await assert.rejects(
    generate(
      { ...defaultOptions(), components: ["notification"] },
      async () => JSON.stringify(createSample()),
      new AbortController().signal,
    ),
    /자동 복구/,
  );
});
test("OpenAI adapter sends server-only key and handles refusals, incomplete responses, rate limits", async () => {
  const request = async (_url: unknown, init?: RequestInit) => {
    const payload = JSON.parse(String(init?.body));
    assert.equal(payload.store, false);
    assert.equal(payload.text.format.type, "json_object");
    return new Response(
      JSON.stringify({
        status: "completed",
        output: [{ content: [{ type: "output_text", text: "{}" }] }],
      }),
    );
  };
  assert.equal(
    await openAIProvider(
      { key: "test-secret", model: "test-model" },
      request as typeof fetch,
    )("JSON", new AbortController().signal),
    "{}",
  );
  for (const payload of [
    { status: "incomplete" },
    { status: "completed", output: [{ content: [{ type: "refusal" }] }] },
  ]) {
    await assert.rejects(
      openAIProvider(
        { key: "x", model: "x" },
        (async () => new Response(JSON.stringify(payload))) as typeof fetch,
      )("JSON", new AbortController().signal),
    );
  }
  await assert.rejects(
    openAIProvider(
      { key: "x", model: "x" },
      (async () => new Response("", { status: 429 })) as typeof fetch,
    )("JSON", new AbortController().signal),
    (e: unknown) => e instanceof ApiError && e.status === 429,
  );
});
test("API origin, missing configuration, request size, rate limit and error responses", async () => {
  const config = {
    key: "",
    model: "",
    origin: "http://localhost:5173",
    timeout: 1000,
    rateLimit: 2,
    concurrency: 2,
    maintenance: false,
  };
  const server = createApi(config, async () => JSON.stringify(createSample()));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as { port: number };
  const url = `http://127.0.0.1:${address.port}/api/generate`;
  const post = (body: unknown, origin = config.origin) =>
    fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify(body),
    });
  try {
    assert.equal(
      (await post(defaultOptions(), "http://evil.example")).status,
      403,
    );
    assert.equal((await post({ extra: "x".repeat(33000) })).status, 413);
    const response = await post(defaultOptions());
    assert.equal(response.status, 200);
    assert.ok((await response.json()).schema);
    assert.equal((await post(defaultOptions())).status, 429);
  } finally {
    server.close();
    server.closeAllConnections();
  }
  const unconfigured = createApi(config);
  unconfigured.listen(0, "127.0.0.1");
  await once(unconfigured, "listening");
  try {
    const r = await fetch(
      `http://127.0.0.1:${(unconfigured.address() as { port: number }).port}/api/generate`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      },
    );
    assert.equal(r.status, 503);
    assert.equal((await r.json()).code, "NOT_CONFIGURED");
  } finally {
    unconfigured.close();
    unconfigured.closeAllConnections();
  }
});
