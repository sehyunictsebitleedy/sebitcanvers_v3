import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { UsageStore, usageDay } from "../src/usage";
import { createApi } from "../src/server";
import { createSample } from "../../sebitcanvers_v3/frontend/src/dashboard/samples";
import { defaultOptions } from "../../sebitcanvers_v3/frontend/src/create/contracts";

const limits = { generate: 1, edit: 2, ipGenerate: 2, ipEdit: 3 };
test("usage snapshots report personal counts, active reservations, IP restriction and day reset without consuming quota", () => {
  const usage = new UsageStore(":memory:", limits);
  const now = Date.parse("2026-10-29T14:59:59Z");
  try {
    assert.equal(usage.snapshot("me", "ip", now).generate.remaining, 1);
    const own = usage.reserve("me", "ip", "generate", 500, now);
    const other = usage.reserve("other", "ip", "generate", 500, now);
    assert.deepEqual(usage.snapshot("me", "ip", now).generate, { limit: 1, used: 0, pending: 1, remaining: 0, ipLimited: true });
    usage.finish(own.id, true, now);
    usage.finish(other.id, false, now);
    assert.deepEqual(usage.snapshot("me", "ip", now).generate, { limit: 1, used: 1, pending: 0, remaining: 0, ipLimited: false });
    usage.reserve("me", "ip", "edit", 300, now);
    assert.equal(usage.snapshot("me", "ip", now + 400).edit.pending, 0);
    assert.equal(usage.snapshot("me", "ip", now + 1000).generate.remaining, 1);
    assert.equal(usage.snapshot("different", "elsewhere", now).generate.used, 0);
  } finally { usage.close(); }
});
test("GET usage establishes a private identity, rejects other origins and never invokes AI or consumes quota", async () => {
  const usage = new UsageStore(":memory:", limits);
  let calls = 0;
  const server = createApi({ key: "test", model: "test", origin: "http://localhost:5173", timeout: 1000, rateLimit: 1, concurrency: 1, maintenance: false, usage }, async () => { calls++; throw new Error("Unexpected provider call"); });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/usage`;
  try {
    const first = await fetch(url);
    assert.equal(first.status, 200);
    assert.equal(first.headers.get("cache-control"), "no-store");
    const cookie = first.headers.get("set-cookie")!;
    assert.match(cookie, /HttpOnly/);
    const id = usage.identity(cookie).id;
    usage.reserve(id, "127.0.0.1", "generate", 10000);
    for (let i = 0; i < 3; i++) {
      const response = await fetch(url, { headers: { Cookie: cookie.split(";")[0] } });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.generate.remaining, 0);
      assert.equal(data.generate.pending, 1);
      assert.equal(data.edit.remaining, 2);
      assert.equal(JSON.stringify(data).includes(id), false);
    }
    assert.equal((await fetch(url, { headers: { Origin: "https://evil.example" } })).status, 403);
    assert.equal(calls, 0);
    usage.close();
    assert.equal((await fetch(url)).status, 503);
  } finally { server.close(); server.closeAllConnections(); }
});
test("daily reservations separate kinds, release failures, expire crashes and reset at Korean midnight", () => {
  const db = new UsageStore(":memory:", limits);
  const now = Date.parse("2026-10-29T14:59:59Z");
  try {
    assert.equal(usageDay(now).resetAt, now + 1000);
    const first = db.reserve("user", "ip", "generate", 500, now);
    assert.throws(() => db.reserve("user", "ip", "generate", 500, now), /사용 한도/);
    db.finish(first.id, false, now);
    const success = db.reserve("user", "ip", "generate", 500, now);
    db.finish(success.id, true, now);
    db.finish(success.id, false, now); // A finally block never refunds success.
    assert.throws(() => db.reserve("user", "ip", "generate", 500, now), /사용 한도/);
    db.reserve("user", "ip", "edit", 500, now);
    db.reserve("user", "ip", "generate", 500, now + 1000);
    const expired = db.reserve("crashed", "other", "generate", 500, now);
    assert.throws(() => db.finish(expired.id, true, now + 600), /expired/);
    db.reserve("crashed", "other", "generate", 500, now + 600);
  } finally { db.close(); }
});
test("persistent identities and counts survive reopening, shared connections enforce IP limits and tampered cookies fail", () => {
  const directory = mkdtempSync(join(tmpdir(), "sebit-usage-"));
  const path = join(directory, "usage.sqlite");
  const first = new UsageStore(path, limits);
  const identity = first.identity(undefined);
  const pending = first.reserve(identity.id, "shared-ip", "generate", 10000);
  first.finish(pending.id, true);
  first.close();
  const second = new UsageStore(path, limits);
  const third = new UsageStore(path, limits);
  try {
    assert.equal(second.identity(identity.cookie).id, identity.id);
    assert.notEqual(second.identity(identity.cookie!.replace(identity.id, "00000000-0000-0000-0000-000000000000")).id, identity.id);
    assert.throws(() => second.reserve(identity.id, "new-ip", "generate", 10000), /사용 한도/);
    second.reserve("another-user", "shared-ip", "generate", 10000);
    assert.throws(() => third.reserve("cookie-reset-user", "shared-ip", "generate", 10000), /사용 한도/);
  } finally { second.close(); third.close(); rmSync(directory, { recursive: true }); }
});
test("API charges validated success once, releases failures, separates generation/edit and returns retry time", async () => {
  const usage = new UsageStore(":memory:", limits);
  let fail = true;
  let calls = 0;
  const server = createApi({ key: "test", model: "test", origin: "http://localhost:5173", timeout: 1000, rateLimit: 30, concurrency: 3, maintenance: false, usage }, async prompt => {
    calls++;
    if (fail) throw new Error("provider failure");
    return prompt.includes("minimal JSON patch")
      ? JSON.stringify({ operations: [{ action: "headerChange", changes: { title: "Updated" } }] })
      : JSON.stringify(createSample());
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  let cookie = "";
  const request = async (path: string, data: unknown) => {
    const response = await fetch(url + path, { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify(data) });
    cookie = response.headers.get("set-cookie")?.split(";")[0] ?? cookie;
    return response;
  };
  try {
    assert.equal((await request("/api/generate", {})).status, 400);
    assert.equal(calls, 0);
    assert.equal((await request("/api/generate", defaultOptions())).status, 502);
    fail = false;
    assert.equal((await request("/api/generate", defaultOptions())).status, 200);
    const before = calls;
    const blocked = await request("/api/generate", defaultOptions());
    assert.equal(blocked.status, 429);
    assert.equal((await blocked.json()).code, "DAILY_LIMIT");
    assert.ok(Number(blocked.headers.get("retry-after")) > 0);
    assert.equal(calls, before);
    const edit = { schema: createSample(), instruction: "Update header", baseRevision: crypto.randomUUID() };
    assert.equal((await request("/api/edit", edit)).status, 200);
    assert.equal((await request("/api/edit", edit)).status, 200);
    assert.equal((await request("/api/edit", edit)).status, 429);
  } finally { server.close(); server.closeAllConnections(); usage.close(); }
});
test("API timeouts refund reservations and unavailable storage prevents provider calls", async () => {
  const usage = new UsageStore(":memory:", limits);
  let hang = true;
  let calls = 0;
  const server = createApi({ key: "test", model: "test", origin: "http://localhost:5173", timeout: 80, rateLimit: 30, concurrency: 2, maintenance: false, usage }, async (_, signal) => {
    calls++;
    if (hang) await new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
    return JSON.stringify(createSample());
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/generate`;
  let cookie = "";
  const request = () => fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify(defaultOptions()) });
  try {
    const timeout = await request();
    cookie = timeout.headers.get("set-cookie")!.split(";")[0];
    assert.equal(timeout.status, 504);
    hang = false;
    assert.equal((await request()).status, 200);
    usage.close();
    const before = calls;
    assert.equal((await request()).status, 503);
    assert.equal(calls, before);
  } finally { server.close(); server.closeAllConnections(); }
});
