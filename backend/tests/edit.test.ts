import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { createSample } from "../../sebitcanvers_v3/frontend/src/dashboard/samples";
import { applyAiPatch } from "../../sebitcanvers_v3/frontend/src/dashboard/aiPatch";
import { editDashboard } from "../src/edit";
import { createApi } from "../src/server";

test("AI edit validates patches, repairs once and derives summary from changes", async () => {
  const schema = createSample();
  const targetId = schema.sections[0].components[0].id;
  const baseRevision = randomUUID();
  let count = 0;
  const result = await editDashboard(
    {
      schema,
      instruction: "첫 KPI 제목을 검수 KPI로 바꿔줘",
      baseRevision,
      targetId,
    },
    async (prompt) => {
      assert.ok(prompt.includes("첫 KPI 제목"));
      count++;
      return count === 1
        ? "{}"
        : JSON.stringify({
            operations: [
              { action: "update", targetId, changes: { title: "검수 KPI" } },
            ],
          });
    },
    new AbortController().signal,
  );
  assert.equal(count, 2);
  assert.equal(result.baseRevision, baseRevision);
  assert.equal(result.repaired, true);
  assert.ok(result.summary[0].includes("제목"));
  const applied = applyAiPatch(schema, result.patch);
  assert.equal(applied.schema.sections[0].components[0].title, "검수 KPI");
  assert.notEqual(schema.sections[0].components[0].title, "검수 KPI");
});
test("AI edit rejects unsupported requests, missing targets, invalid patches and cancellation", async () => {
  const input = {
    schema: createSample(),
    instruction: "수정",
    baseRevision: randomUUID(),
  };
  await assert.rejects(
    editDashboard(
      input,
      async () =>
        JSON.stringify({ unsupported: "실제 DB 연결은 지원하지 않습니다." }),
      new AbortController().signal,
    ),
    /DB 연결/,
  );
  await assert.rejects(
    editDashboard(
      { ...input, targetId: "missing" },
      async () => {
        throw Error("not called");
      },
      new AbortController().signal,
    ),
    /대상/,
  );
  let count = 0;
  await assert.rejects(
    editDashboard(
      input,
      async () => {
        count++;
        return JSON.stringify({
          operations: [{ action: "themeChange", changes: { primary: "red" } }],
        });
      },
      new AbortController().signal,
    ),
    /자동 복구/,
  );
  assert.equal(count, 2);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    editDashboard(
      input,
      async () => {
        throw Error("not called");
      },
      controller.signal,
    ),
  );
});
test("edit endpoint shares limits and never returns a provider secret", async () => {
  const config = {
    key: "test-secret",
    model: "test-model",
    origin: "http://localhost:5173",
    timeout: 1000,
    rateLimit: 1,
    concurrency: 1,
    maintenance: false,
  };
  const server = createApi(config, async () =>
    JSON.stringify({
      operations: [{ action: "headerChange", changes: { title: "수정 결과" } }],
    }),
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const body = {
    schema: createSample(),
    instruction: "제목 수정",
    baseRevision: randomUUID(),
  };
  try {
    const response = await fetch(url + "/api/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: config.origin },
      body: JSON.stringify(body),
    });
    assert.equal(response.status, 200);
    const raw = await response.text();
    assert.ok(!raw.includes("test-secret"));
    const result = JSON.parse(raw);
    assert.equal(result.baseRevision, body.baseRevision);
    assert.ok(result.patch);
    const limited = await fetch(url + "/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(limited.status, 429);
  } finally {
    server.close();
    server.closeAllConnections();
  }
});
