import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync, rmSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { TelemetryStore, tokenUsage } from "../src/telemetry";
import { readTelemetryReport } from "../src/telemetryReport";

test("report separates final outcomes and provider tokens, preserves unknowns and leaves DB unchanged", () => {
  const base = realpathSync(tmpdir());
  const dir = mkdtempSync(join(base, "sebit-report-"));
  const path = join(dir, "events.sqlite");
  const now = Date.now();
  try {
    const store = new TelemetryStore(path);
    const event = { requestId: "PRIVATE-ID", kind: "generate" as const, phase: "provider" as const, attempt: 1, ok: true, code: null, ms: 100 };
    store.record(event, now - 25 * 3600000);
    store.record({ ...event, tokens: tokenUsage({ total_tokens: 30, input_tokens: 20, output_tokens: 10 }) }, now);
    store.record({ ...event, attempt: 2 }, now);
    store.record({ ...event, phase: "request", attempt: 2, ms: 250, tokens: tokenUsage({ total_tokens: 999 }) }, now);
    store.record({ ...event, phase: "request", kind: "edit", ok: false, code: "REQUEST_TIMEOUT", ms: 1000 }, now);
    store.record({ ...event, kind: "edit", tokens: null }, now);
    store.close();
    const before = readFileSync(path);
    const report = JSON.parse(JSON.stringify(readTelemetryReport(path, 24, now)));
    assert.equal(report.requests.find((r: { kind: string }) => r.kind === "generate").repairRequests, 1);
    assert.equal(report.requests.find((r: { kind: string }) => r.kind === "edit").failed, 1);
    const generated = report.providers.find((r: { kind: string }) => r.kind === "generate");
    assert.equal(generated.attempts, 2);
    assert.equal(generated.attemptsWithKnownTotal, 1);
    assert.equal(generated.knownTotalTokens, 30);
    assert.equal(report.providers.find((r: { kind: string }) => r.kind === "edit").knownTotalTokens, null);
    assert.deepEqual(report.failures, [{ kind: "edit", code: "REQUEST_TIMEOUT", count: 1 }]);
    assert.doesNotMatch(JSON.stringify(report), /PRIVATE-ID/);
    assert.deepEqual(readFileSync(path), before);
    for (const hours of [0, 721, 1.5, NaN]) assert.throws(() => readTelemetryReport(path, hours, now));
    const missing = join(dir, "missing.sqlite");
    assert.throws(() => readTelemetryReport(missing));
    assert.equal(existsSync(missing), false);
    const empty = readTelemetryReport(path, 1, now + 2 * 3600000);
    assert.deepEqual(empty.requests, []);
    assert.deepEqual(empty.providers, []);
  } finally {
    assert.equal(dirname(dir), base);
    rmSync(dir, { recursive: true });
  }
});
