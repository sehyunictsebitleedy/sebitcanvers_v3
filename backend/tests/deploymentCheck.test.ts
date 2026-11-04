import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, rmSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkDeployment } from "../src/deploymentCheck";
import { readRuntimeSettings } from "../src/runtimeSettings";

function fixture() {
  const temp = mkdtempSync(join(realpathSync(tmpdir()), "sebit-deploy-check-"));
  const root = join(temp, "release");
  const data = join(temp, "data");
  mkdirSync(join(root, "sebitcanvers_v3/frontend/dist"), { recursive: true });
  mkdirSync(data);
  writeFileSync(join(root, "sebitcanvers_v3/frontend/dist/index.html"), "sample");
  const env = { NODE_ENV: "production", HOST: "127.0.0.1", APP_ORIGIN: "https://dashboard.example.com",
    AI_TRUSTED_PROXIES: "127.0.0.1", AI_USAGE_DB: join(data, "usage.sqlite"),
    AI_TELEMETRY_DB: join(data, "events.sqlite"), CMS_DB: join(data, "cms.sqlite"), OPENAI_API_KEY: "SECRET-SENTINEL", OPENAI_MODEL: "MODEL-SENTINEL" };
  return { root, data, env, cleanup() {
    assert.equal(dirname(temp), realpathSync(tmpdir()));
    assert.ok(temp.includes("sebit-deploy-check-"));
    rmSync(temp, { recursive: true, force: true });
  } };
}

test("deployment preflight is read-only and never returns credentials or configured values", () => {
  const f = fixture();
  try {
    const checks = checkDeployment(f.env, f.root, "24.16.0");
    assert.ok(checks.every(check => check.ok));
    assert.deepEqual(readdirSync(f.data), []);
    assert.doesNotMatch(JSON.stringify(checks), /SECRET-SENTINEL|MODEL-SENTINEL|dashboard\.example\.com/);
  } finally { f.cleanup(); }
});

test("preflight rejects development config, missing key, unsafe DB placement and missing build", () => {
  const f = fixture();
  try {
    const cases: [NodeJS.ProcessEnv, string][] = [
      [{ NODE_ENV: "development" }, "NODE_ENV"], [{ OPENAI_API_KEY: "" }, "OPENAI_API_KEY"],
      [{ AI_MAINTENANCE: "true" }, "MAINTENANCE"], [{ HOST: "0.0.0.0" }, "PRODUCTION_SETTINGS"],
      [{ AI_USAGE_DB: join(f.root, "usage.sqlite") }, "AI_USAGE_DB"],
      [{ AI_USAGE_DB: join(f.data, "missing", "usage.sqlite") }, "AI_USAGE_DB"],
      [{ AI_TELEMETRY_DB: f.env.AI_USAGE_DB }, "SEPARATE_DATABASES"],
      [{ AI_TIMEOUT_MS: "SECRET-SENTINEL" }, "NUMERIC_SETTINGS"],
    ];
    for (const [patch, name] of cases) {
      const checks = checkDeployment({ ...f.env, ...patch }, f.root);
      assert.equal(checks.find(check => check.name === name)?.ok, false, name);
      assert.doesNotMatch(JSON.stringify(checks), /SECRET-SENTINEL/);
    }
    assert.equal(checkDeployment(f.env, f.root, "22.0.0")[0].ok, false);
    assert.equal(checkDeployment(f.env, f.data).find(check => check.name === "FRONTEND_BUILD")?.ok, false);
  } finally { f.cleanup(); }
});

test("shared runtime settings preserve development defaults and validate all numeric bounds", () => {
  const s = readRuntimeSettings({});
  assert.equal(s.host, "127.0.0.1"); assert.equal(s.port, 3001); assert.equal(s.timeout, 60000);
  assert.deepEqual(s.limits, { generate: 3, edit: 10, ipGenerate: 50, ipEdit: 200, chat: 50, ipChat: 500 });
  assert.equal(readRuntimeSettings({ AI_TIMEOUT_MS: "120000" }).timeout, 120000);
  for (const key of ["PORT", "AI_TIMEOUT_MS", "AI_RATE_LIMIT", "AI_CONCURRENCY", "AI_DAILY_GENERATE", "AI_DAILY_EDIT", "AI_DAILY_IP_GENERATE", "AI_DAILY_IP_EDIT"])
    assert.throws(() => readRuntimeSettings({ [key]: "0" }));
});
