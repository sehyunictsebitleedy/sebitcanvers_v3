import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApi } from '../src/server';

test('explicit local aliases reach validation; other origins remain forbidden for generate and edit',async()=>{
  let calls=0;
  const config={key:'test',model:'test',origin:'http://localhost:5173',allowedOrigins:['http://127.0.0.1:5173','http://localhost:5174','http://127.0.0.1:5174'],timeout:1000,rateLimit:30,concurrency:2,maintenance:false};
  const server=createApi(config,async()=>{calls++;throw new Error('Invalid input must never call AI');});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  try {
    for(const endpoint of ['/api/generate','/api/edit']){
      for(const origin of [config.origin,...config.allowedOrigins]){
        const response=await fetch(base+endpoint,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:'{}'});
        assert.equal(response.status,400);assert.equal((await response.json()).code,'INVALID_OPTIONS');
      }
      for(const origin of ['http://evil.example','http://localhost:9999','http://localhost:5173.evil.example','null']){
        const response=await fetch(base+endpoint,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:'{}'});
        assert.equal(response.status,403);assert.equal((await response.json()).code,'ORIGIN');
      }
    }
    assert.equal(calls,0);
  } finally {server.close();server.closeAllConnections();}
});
