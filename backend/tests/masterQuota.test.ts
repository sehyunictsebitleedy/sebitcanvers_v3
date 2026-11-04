import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { CmsStore } from "../src/cms";
import { UsageStore } from "../src/usage";
import { createApi } from "../src/server";
import { createSample } from "../../sebitcanvers_v3/frontend/src/dashboard/samples";
import { defaultOptions } from "../../sebitcanvers_v3/frontend/src/create/contracts";

test("only valid master sessions bypass exhausted personal/IP generate and edit quotas; logout restores limits", async () => {
  const cms = new CmsStore(":memory:");
  const usage = new UsageStore(":memory:", {generate:1,edit:1,ipGenerate:1,ipEdit:1});
  await cms.setPassword("test-master-password");
  const identity = usage.identity(undefined);
  for (const kind of ["generate", "edit"] as const) usage.finish(usage.reserve(identity.id, "127.0.0.1", kind, 1000).id, true);
  let calls = 0;
  const origin = "http://localhost:5173";
  const server = createApi({cms, usage, key:"test",model:"test",origin,timeout:2000,rateLimit:20,concurrency:1,maintenance:false}, async prompt => {
    calls++;
    return prompt.includes("minimal JSON patch") ? JSON.stringify({operations:[{action:"headerChange",changes:{title:"Master edited"}}]}) : JSON.stringify(createSample());
  });
  server.listen(0,"127.0.0.1"); await once(server,"listening");
  const url = `http://127.0.0.1:${(server.address() as {port:number}).port}`;
  const post = (path:string, data:unknown, cookie = identity.cookie ?? "", csrf = "") => fetch(url+path,{method:"POST",headers:{Origin:origin,"Content-Type":"application/json",Cookie:cookie,"X-CMS-CSRF":csrf},body:JSON.stringify(data)});
  try {
    assert.equal((await post("/api/generate",defaultOptions())).status,429);
    assert.equal((await post("/api/generate",defaultOptions(),"sebit_master_v2=forged")).status,429);
    const login = await post("/api/cms/login",{username:"master",password:"test-master-password"});
    const header = login.headers.getSetCookie().find(c=>c.startsWith("sebit_master_v2="))!;
    assert.match(header,/Path=\/api;/); assert.match(header,/HttpOnly/);
    const cookie = header.split(";")[0] + "; " + identity.cookie!.split(";")[0];
    const csrf = (await login.json()).csrf;
    assert.deepEqual(await (await fetch(url+"/api/usage",{headers:{Cookie:cookie}})).json(),{exempt:true});
    assert.equal((await post("/api/generate",defaultOptions(),cookie)).status,200);
    assert.equal((await post("/api/generate",defaultOptions(),cookie)).status,200);
    assert.equal((await post("/api/edit",{schema:createSample(),instruction:"Change header",baseRevision:randomUUID()},cookie)).status,200);
    assert.equal(calls,3);
    assert.equal(usage.snapshot(identity.id,"127.0.0.1").generate.used,1);
    assert.equal(usage.snapshot(identity.id,"127.0.0.1").edit.used,1);
    assert.equal((await post("/api/cms/logout",{},cookie,csrf)).status,200);
    assert.equal((await post("/api/generate",defaultOptions(),cookie)).status,429);
    assert.notEqual((await (await fetch(url+"/api/usage",{headers:{Cookie:cookie}})).json()).exempt,true);
  } finally { server.close(); server.closeAllConnections(); cms.close(); usage.close(); }
});

test("legacy login upgrades on admin visit; master still obeys rate limits and session expiry", async () => {
  const cms = new CmsStore(":memory:"); await cms.setPassword("test-master-password");
  const login = await cms.login("master","test-master-password","ip");
  assert.ok(login && typeof login.token === "string");
  const server = createApi({cms,key:"test",model:"test",origin:"http://localhost:5173",timeout:2000,rateLimit:1,concurrency:1,maintenance:false},async()=>JSON.stringify(createSample()));
  server.listen(0,"127.0.0.1"); await once(server,"listening");
  const url = `http://127.0.0.1:${(server.address() as {port:number}).port}`;
  try {
    const upgrade = await fetch(url+"/api/cms/session",{headers:{Cookie:`sebit_master=${login.token}`}});
    assert.equal((await upgrade.json()).authenticated,true);
    assert.ok(upgrade.headers.getSetCookie().some(v=>v.startsWith("sebit_master=;") && v.includes("Max-Age=0")));
    const cookie=upgrade.headers.getSetCookie().find(v=>v.startsWith("sebit_master_v2="))!.split(";")[0];
    const post=()=>fetch(url+"/api/generate",{method:"POST",headers:{Cookie:cookie,"Content-Type":"application/json"},body:JSON.stringify(defaultOptions())});
    assert.equal((await post()).status,200);
    const limited=await post(); assert.equal(limited.status,429); assert.equal((await limited.json()).code,"RATE_LIMIT");
    assert.equal(cms.session(login.token,Date.now()+8*3600000),undefined);
    await cms.setPassword("reset-master-password",true);
    assert.equal((await (await fetch(url+"/api/cms/session",{headers:{Cookie:cookie}})).json()).authenticated,false);
  } finally {server.close();server.closeAllConnections();cms.close();}
});
