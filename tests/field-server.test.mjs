import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {once} from 'node:events';
test('unfinished field cards are public, remaining hand cards stay private, and only the owner can edit',async()=>{
 const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'0',HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']});
 try{
  const [line]=await Promise.race([once(child.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Startup timed out')),7000).unref())]);const base=String(line).match(/http:\/\/127\.0\.0\.1:\d+/)[0];
  const api=async(endpoint,body,token)=>{if(body?.code&&token){const state=await fetch(base+'/api/state?code='+body.code,{headers:{Authorization:'Bearer '+token}}).then(r=>r.json());body={revision:state.revision,...body};}const response=await fetch(base+'/api/'+endpoint,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,value:await response.json()};};
  const hostRoom=(await api('create',{name:'Host'})).value,code=hostRoom.room.code,host=hostRoom.token,guest=(await api('join',{code,name:'Guest'})).value.token;
  let s=(await api('start',{code},host)).value;const first=s.state.hands[0].find(c=>!c.joker).id;
  assert.equal((await api('action',{code,action:{type:'field-stage',ids:[first]}},host)).status,400);
  await api('action',{code,action:{type:'discard',ids:[first]}},host);
  s=(await api('action',{code,action:{type:'draw',source:'stock'}},guest)).value;const discard=s.state.hands[1].find(c=>!c.joker).id;
  await api('action',{code,action:{type:'discard',ids:[discard]}},guest);
  s=(await api('action',{code,action:{type:'draw',source:'stock'}},host)).value;const card=s.state.hands[0].find(c=>!c.joker);
  const staged=await api('action',{code,action:{type:'field-stage',ids:[card.id]}},host);assert.equal(staged.status,200);assert.equal(staged.value.state.fieldGroups[0].cards[0].id,card.id);
  const publicView=(await api('state?code='+code,null,guest)).value;assert.equal(publicView.state.fieldGroups[0].owner,0);assert.equal(publicView.state.fieldGroups[0].cards[0].id,card.id);assert.ok(publicView.state.hands[0].every(c=>c.hidden));assert.ok(publicView.state.stock.every(c=>c.hidden));assert.equal(publicView.state.fieldGroups[0].ids,undefined);
  assert.equal((await api('action',{code,action:{type:'field-return',index:0}},guest)).status,400);
  assert.equal((await api('action',{code,action:{type:'field-merge',index:0,ids:[card.id]}},host)).status,400);
  const returned=(await api('action',{code,action:{type:'field-return',index:0}},host)).value;assert.equal(returned.state.fieldGroups.length,0);assert.ok(returned.state.hands[0].some(c=>c.id===card.id));
 }finally{child.kill();}
});
