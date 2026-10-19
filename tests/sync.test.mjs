import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {once} from 'node:events';
test('long polling wakes on changes, rejects stale moves, protects views and releases closed requests',async()=>{
 const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'3023'},stdio:['ignore','pipe','pipe']});
 try{
  await Promise.race([once(child.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Startup timeout')),7000).unref())]);
  const api=async(endpoint,body,token,signal)=>{const r=await fetch('http://127.0.0.1:3023/api/'+endpoint,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal});return {status:r.status,value:r.status===204?null:await r.json()};};
  const created=(await api('create',{name:'Host'})).value,host=created.token,code=created.room.code;
  let done=false;const pending=api('state?code='+code+'&since=0',null,host).then(r=>{done=true;return r;});
  await new Promise(r=>setTimeout(r,100));assert.equal(done,false,'an unchanged table holds the request');
  const joined=(await api('join',{code,name:'Guest'})).value,guest=joined.token;
  const wake=await pending;assert.equal(wake.value.revision,1);assert.equal(wake.value.players[1],'Guest');
  for(const revision of [undefined,0,2,'1']){const r=await api('settings',{code,revision,opening:31},host);assert.equal(r.status,409);assert.equal(r.value.room.revision,1);assert.equal(r.value.room.options.opening,51);}
  const race=await Promise.all([31,51].map(opening=>api('settings',{code,revision:1,opening},host)));assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
  const started=await api('start',{code,revision:2},host);assert.equal(started.status,200);
  const stale=await api('action',{code,revision:2,action:{type:'discard',ids:[]}},guest);assert.equal(stale.status,409);assert.deepEqual(stale.value.room.state.hands[0][0],{hidden:true});assert.ok(stale.value.room.state.hands[1][0].id);assert.ok(stale.value.room.state.stock.every(c=>c.hidden));
  const idle=await api('state?code='+code+'&since=3',null,host);assert.equal(idle.status,204);assert.equal(idle.value,null);
  const abort=new AbortController(),aborted=api('state?code='+code+'&since=3',null,host,abort.signal);abort.abort();await assert.rejects(aborted,{name:'AbortError'});
  const watcher=api('state?code='+code+'&since=3',null,guest);await new Promise(r=>setTimeout(r,50));assert.equal((await api('leave',{code,revision:3},host)).status,200);assert.equal((await watcher).value.host,1);
  const last=api('state?code='+code+'&since=4',null,guest);await new Promise(r=>setTimeout(r,50));await api('leave',{code,revision:4},guest);assert.equal((await last).status,400);
 }finally{child.kill();}
});
