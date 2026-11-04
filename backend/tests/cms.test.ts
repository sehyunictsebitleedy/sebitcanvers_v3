import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, rmSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { CmsStore, CmsConflict, validateBundle } from "../src/cms";
import { createApi } from "../src/server";
import { createSample } from "../../sebitcanvers_v3/frontend/src/dashboard/samples";

test("CMS separates drafts/publications, rejects stale writes, persists images and restores previous publication", () => {
  const base = realpathSync(tmpdir()), dir = mkdtempSync(join(base, "sebit-cms-"));
  const path = join(dir, "cms.sqlite");
  let store = new CmsStore(path);
  try {
    const bundle = { schema: createSample(), assets: {} as Record<string, string> };
    bundle.schema.mainVisual.imageAssetId = "image-test";
    bundle.assets["image-test"] = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
    assert.throws(() => validateBundle({ ...bundle, assets: {} }));
    assert.throws(() => validateBundle({ ...bundle, assets: { "image-test": "data:image/svg+xml;base64,PHN2Zz4=" } }));
    let state = store.change(0, "save", bundle);
    assert.equal(state.published, null);
    state = store.change(state.revision, "publish");
    const title = bundle.schema.header.title;
    bundle.schema.header.title = "Second draft";
    state = store.change(state.revision, "save", bundle);
    assert.equal(state.published?.schema.header.title, title);
    assert.throws(() => store.change(0, "save", bundle), CmsConflict);
    state = store.change(state.revision, "publish");
    state = store.change(state.revision, "restore");
    assert.equal(state.published?.schema.header.title, title);
    assert.equal(state.draft?.schema.header.title, "Second draft");
    store.close(); store = new CmsStore(path);
    assert.equal(store.state().published?.assets["image-test"], bundle.assets["image-test"]);
  } finally { store.close(); assert.equal(dirname(dir), base); rmSync(dir, { recursive: true }); }
});

test("master authentication expires, throttles failures and invalidates sessions after password reset", async () => {
  const store = new CmsStore(":memory:");
  try {
    await store.setPassword("test-password-123");
    for (let i = 0; i < 5; i++) assert.equal(await store.login("master", "incorrect", "ip", 1000), null);
    assert.deepEqual(await store.login("master", "test-password-123", "ip", 1000), { limited: true });
    const result = await store.login("master", "test-password-123", "ip", 901001);
    assert.ok(result && typeof result.token === "string");
    assert.ok(store.session(result.token, 901002));
    assert.equal(store.session(result.token, 901001 + 8*3600000), undefined);
    await store.setPassword("new-test-password-456", true);
    assert.equal(store.session(result.token, 901002), undefined);
  } finally { store.close(); }
});

test("CMS API enforces master sessions, Origin and CSRF; public cannot read drafts or creation requests", async () => {
  const cms = new CmsStore(":memory:"); await cms.setPassword("test-password-123");
  const origin = "http://localhost:5173";
  const server = createApi({ cms, key: "", model: "", origin, timeout: 1000, rateLimit: 1, concurrency: 1, maintenance: false });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const url = `http://127.0.0.1:${(server.address() as {port:number}).port}/api/cms/`;
  const post = (path: string, data: unknown, cookie = "", csrf = "", requestOrigin = origin) => fetch(url + path, { method: "POST", headers: { Origin: requestOrigin, Cookie: cookie, "Content-Type": "application/json", "X-CMS-CSRF": csrf }, body: JSON.stringify(data) });
  try {
    assert.equal((await fetch(url + "state")).status, 401);
    assert.equal((await fetch(url + "public")).status, 404);
    assert.equal((await post("save", {revision:0})).status, 401);
    assert.equal((await post("login", {username:"master",password:"test-password-123"}, "", "", "https://evil.example")).status, 403);
    const login = await post("login", {username:"master",password:"test-password-123"});
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie")!;
    assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/);
    const csrf = (await login.json()).csrf;
    const schema = createSample();
    const bundle = {schema,assets:{}};
    assert.equal((await post("save", {revision:0,bundle}, cookie)).status, 403);
    assert.equal((await post("save", {revision:0,bundle}, cookie, csrf)).status, 200);
    assert.equal((await fetch(url + "public")).status, 404);
    assert.equal((await post("publish", {revision:0}, cookie, csrf)).status, 409);
    assert.equal((await post("publish", {revision:1}, cookie, csrf)).status, 200);
    const published = await (await fetch(url + "public")).json();
    assert.deepEqual(published.schema.settings, {dataMode:"sample"});
    assert.equal((await post("logout", {}, cookie, csrf)).status, 200);
    assert.equal((await fetch(url + "state", {headers:{Cookie:cookie}})).status, 401);
  } finally { server.close(); server.closeAllConnections(); cms.close(); }
});
