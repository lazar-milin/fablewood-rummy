import test,{before,after} from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {once} from 'node:events';
// TRUST_PROXY=true: one reverse proxy forwards every player, so the limits count the address it appends to X-Forwarded-For.
let child;
const create=from=>fetch('http://127.0.0.1:3021/api/create',{method:'POST',headers:{'Content-Type':'application/json','X-Forwarded-For':`198.51.100.250, ${from}`},body:'{}'});
before(async()=>{child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'3021',TRUST_PROXY:'true'},stdio:['ignore','pipe','pipe']});await Promise.race([once(child.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Server startup timeout')),7000).unref())]);});
after(()=>child.kill());
test('each address may create 20 tables a minute, counted per forwarded client',async()=>{
 for(let i=0;i<20;i++)assert.equal((await create('203.0.113.1')).status,200,`table ${i+1}`);
 const limited=await create('203.0.113.1');assert.equal(limited.status,429);assert.deepEqual(await limited.json(),{error:'Too many new tables. Try again shortly.'});
 assert.equal((await create('203.0.113.2')).status,200,'another player behind the same proxy can still create a table');
 assert.equal((await fetch('http://127.0.0.1:3021/api/tables',{headers:{'X-Forwarded-For':'203.0.113.1'}})).status,200,'other requests have their own allowance');
});
