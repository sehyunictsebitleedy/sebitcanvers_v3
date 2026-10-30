import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { resolve } from "node:path";
import { clientIpResolver, normalizeIp } from "../src/clientIp";
import { validateProduction } from "../src/production";
import { createApi } from "../src/server";
import { UsageStore } from "../src/usage";
import { createSample } from "../../sebitcanvers_v3/frontend/src/dashboard/samples";
import { defaultOptions } from "../../sebitcanvers_v3/frontend/src/create/contracts";

test("only explicitly trusted peers can supply one canonical client IP", () => {
  const request = (peer: string, header?: string | string[]) => ({ socket: { remoteAddress: peer }, headers: { "x-forwarded-for": header } });
  assert.equal(clientIpResolver()(request("192.0.2.1", "203.0.113.1")), "192.0.2.1");
  const trusted = clientIpResolver(["127.0.0.1"]);
  assert.equal(trusted(request("::ffff:127.0.0.1", "203.0.113.1")), "203.0.113.1");
  assert.equal(normalizeIp("2001:0db8:0:0:0:0:0:1"), "2001:db8::1");
  assert.equal(normalizeIp("::ffff:c000:201"), "192.0.2.1");
  for (const value of [undefined, "", "unknown", "203.0.113.1, 192.0.2.1", "192.0.2.1:80", ["203.0.113.1"], "fe80::1%eth0"]) {
    assert.throws(() => trusted(request("127.0.0.1", value)), /프록시/);
  }
  for (const proxy of ["*", "127.0.0.0/8", "localhost"]) assert.throws(() => clientIpResolver([proxy]));
});
test("production rejects public bindings, HTTP origins and temporary or shared DB paths", () => {
  const valid = { environment: "production", host: "127.0.0.1", origin: "https://dashboard.example.com", allowedOrigins: [], proxies: ["127.0.0.1"], usagePath: resolve("data/usage.sqlite"), telemetryPath: resolve("data/events.sqlite") };
  assert.doesNotThrow(() => validateProduction(valid));
  for (const patch of [{ host: "0.0.0.0" }, { origin: "http://example.com" }, { origin: "https://example.com/path" }, { allowedOrigins: ["http://localhost:5173"] }, { proxies: [] }, { proxies: ["192.0.2.1"] }, { usagePath: "relative.sqlite" }, { telemetryPath: valid.usagePath }])
    assert.throws(() => validateProduction({ ...valid, ...patch }));
  assert.doesNotThrow(() => validateProduction({ ...valid, environment: "development", origin: "http://localhost:5173" }));
});
test("trusted proxy separates rate limits and usage by actual client; malformed header never calls AI", async () => {
  const usage = new UsageStore(":memory:", { generate: 5, edit: 20, ipGenerate: 1, ipEdit: 2 });
  let calls = 0;
  const server = createApi({ key: "test", model: "test", origin: "https://dashboard.example.com", timeout: 1000, rateLimit: 1, concurrency: 2, maintenance: false, trustedProxies: ["127.0.0.1"], usage }, async () => { calls++; return JSON.stringify(createSample()); });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const post = (ip: string) => fetch(base + "/api/generate", { method: "POST", headers: { "Content-Type": "application/json", "X-Forwarded-For": ip }, body: JSON.stringify(defaultOptions()) });
  try {
    assert.equal((await post("192.0.2.1")).status, 200);
    assert.equal((await post("192.0.2.2")).status, 200);
    assert.equal((await post("192.0.2.1")).status, 429);
    assert.equal((await post("192.0.2.3, 192.0.2.4")).status, 400);
    const first = await fetch(base + "/api/usage", { headers: { "X-Forwarded-For": "192.0.2.1" } });
    assert.equal((await first.json()).generate.ipLimited, true);
    assert.match(first.headers.get("set-cookie")!, /Secure/);
    const fresh = await fetch(base + "/api/usage", { headers: { "X-Forwarded-For": "192.0.2.3" } });
    assert.equal((await fresh.json()).generate.ipLimited, false);
    assert.equal((await fetch(base + "/api/usage")).status, 400);
    assert.equal(calls, 2);
  } finally { server.close(); server.closeAllConnections(); usage.close(); }
});
