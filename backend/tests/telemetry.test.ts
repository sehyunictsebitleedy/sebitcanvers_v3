import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { TelemetryStore, tokenUsage } from "../src/telemetry";
import type { TokenUsage } from "../src/telemetry";
import { openAIProvider } from "../src/generate";
import { createApi } from "../src/server";
import { defaultOptions } from "../../sebitcanvers_v3/frontend/src/create/contracts";
import { createSample } from "../../sebitcanvers_v3/frontend/src/dashboard/samples";

test("token counters preserve reported totals and unknowns without estimating missing values", () => {
  assert.deepEqual(tokenUsage({ input_tokens: 10, output_tokens: 8, total_tokens: 18, input_tokens_details: { cached_tokens: 3 }, output_tokens_details: { reasoning_tokens: 5 } }), { input: 10, output: 8, total: 18, cached: 3, reasoning: 5 });
  assert.deepEqual(tokenUsage({ input_tokens: -1, output_tokens: "10", total_tokens: 1.2 }), { input: null, output: null, total: null, cached: null, reasoning: null });
  assert.equal(tokenUsage(null).total, null);
  assert.equal(tokenUsage({ input_tokens: 0 }).input, 0);
});
test("adapter captures usage before incomplete/refusal validation and missing usage remains unknown", async () => {
  for (const status of ["completed", "incomplete", "refusal", "missing"]) {
    const captured: TokenUsage[] = [];
    const provider = openAIProvider({ key: "private-key", model: "test" }, (async () => new Response(JSON.stringify({
      status: status === "incomplete" ? "incomplete" : "completed",
      usage: status === "missing" ? null : { input_tokens: 7, output_tokens: 3, total_tokens: 10 },
      output: [{ content: [{ type: status === "refusal" ? "refusal" : "output_text", text: "private-response" }] }]
    }))) as typeof fetch, value => captured.push(value));
    if (status === "incomplete" || status === "refusal") await assert.rejects(provider("private-prompt", new AbortController().signal));
    else await provider("private-prompt", new AbortController().signal);
    assert.equal(captured.length, 1);
    assert.equal(captured[0].total, status === "missing" ? null : 10);
    assert.equal(JSON.stringify(captured).includes("private"), false);
  }
});
test("events persist across reopening, omit content and prune records older than 30 days on write", () => {
  const dir = mkdtempSync(join(tmpdir(), "sebit-events-"));
  const path = join(dir, "events.sqlite");
  const now = Date.now();
  let store = new TelemetryStore(path);
  const event = { requestId: "request", kind: "edit" as const, phase: "provider" as const, attempt: 1, ok: false, code: "INCOMPLETE", ms: 2, tokens: tokenUsage({ total_tokens: 10 }), prompt: "secret-body" };
  store.record(event, now - 31 * 86400000);
  store.close();
  store = new TelemetryStore(path);
  store.record(event, now);
  store.close();
  const db = new DatabaseSync(path);
  try {
    const rows = db.prepare("SELECT * FROM ai_events").all();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].total_tokens, 10);
    assert.equal(rows[0].input_tokens, null);
    assert.equal(JSON.stringify(rows).includes("secret-body"), false);
  } finally { db.close(); rmSync(dir, { recursive: true }); }
});
test("API records repair attempts and final validation outcome; recording failure never fails a successful response", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sebit-events-api-"));
  const path = join(dir, "events.sqlite");
  const telemetry = new TelemetryStore(path);
  let calls = 0;
  const server = createApi({ key: "secret-key", model: "test", origin: "http://localhost:5173", timeout: 1000, rateLimit: 20, concurrency: 1, maintenance: false, telemetry }, async () => ++calls === 1 ? "invalid" : JSON.stringify(createSample()));
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/generate`;
  const post = (input: unknown) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  const db = new DatabaseSync(path);
  try {
    const response = await post({ ...defaultOptions(), additionalRequest: "private-user-content" });
    assert.equal(response.status, 200);
    const id = (await response.json()).requestId;
    const rows = db.prepare("SELECT * FROM ai_events WHERE request_id=? ORDER BY id").all(id);
    assert.deepEqual(rows.map(row => [row.phase, row.attempt, row.ok]), [["provider", 1, 1], ["provider", 2, 1], ["request", 2, 1]]);
    assert.ok(rows.every(row => row.total_tokens === null));
    assert.equal((await post({})).status, 400);
    const failure = db.prepare("SELECT * FROM ai_events WHERE code='INVALID_OPTIONS'").get()!;
    assert.equal(failure.attempt, 0);
    assert.equal(JSON.stringify(db.prepare("SELECT * FROM ai_events").all()).includes("private-user-content"), false);
    telemetry.close();
    assert.equal((await post(defaultOptions())).status, 200);
  } finally { server.close(); server.closeAllConnections(); db.close(); rmSync(dir, { recursive: true }); }
});
