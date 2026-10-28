import {test} from 'vitest';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

test('only the host changes the live timer, with a fresh clock preserved through undo and cancel draw',async()=>{
 const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'0',HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']});
 try{
  const [line]=await Promise.race([once(child.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Startup timed out')),7000).unref())]);
  const base=String(line).match(/http:\/\/127\.0\.0\.1:\d+/)[0];
  const api=async(endpoint,body,token)=>{
   if(body?.code&&token){const state=await fetch(base+'/api/state?code='+body.code,{headers:{Authorization:'Bearer '+token}}).then(r=>r.json());body={revision:state.revision,...body};}
   const response=await fetch(base+'/api/'+endpoint,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
   return {status:response.status,value:await response.json()};
  };
  const created=(await api('create',{name:'Host'})).value,code=created.room.code,host=created.token;
  const guest=(await api('join',{code,name:'Guest'})).value.token;
  let room=(await api('start',{code},host)).value;
  assert.equal((await api('settings',{code,timer:60},guest)).status,400);
  assert.equal((await api('settings',{code,timer:45},host)).status,400);
  assert.equal((await api('settings',{code,timer:60,undo:false},host)).status,400);
  assert.equal((await api('settings',{code,opening:31},host)).status,400);
  const first=room.state.hands[0].find(c=>!c.joker);
  await api('action',{code,action:{type:'discard',ids:[first.id]}},host);
  room=(await api('action',{code,action:{type:'draw',source:'discard'}},guest)).value;assert.equal(room.canUndo,true);
  const turn=room.state.turn,started=Date.now();
  room=(await api('settings',{code,timer:30},host)).value;
  assert.equal(room.options.timer,30);assert.equal(room.options.undo,true);assert.equal(room.state.turn,turn);assert.ok(room.state.turnStarted>=started);
  const reset=room.state.turnStarted;
  const guestView=(await api('state?code='+code,null,guest)).value;assert.equal(guestView.options.timer,30);assert.equal(guestView.state.turnStarted,reset);
  const undone=await api('undo',{code},guest);assert.equal(undone.status,200);assert.equal(undone.value.state.stage,'draw');assert.equal(undone.value.state.turnStarted,reset);
  const drawn=(await api('action',{code,action:{type:'draw',source:'stock'}},guest)).value;
  const discard=drawn.state.hands[1].find(c=>!c.joker);
  await api('action',{code,action:{type:'discard',ids:[discard.id]}},guest);
  room=(await api('action',{code,action:{type:'draw',source:'discard'}},host)).value;assert.equal(room.state.mustOpen,true);
  room=(await api('settings',{code,timer:120},host)).value;
  const cancelled=await api('cancel-draw',{code},host);assert.equal(cancelled.status,200);assert.equal(cancelled.value.state.turnStarted,room.state.turnStarted);
  assert.equal((await api('settings',{code,timer:0,revision:0},host)).status,409);
  assert.equal((await api('settings',{code,timer:0},host)).value.options.timer,0);
 }finally{child.kill();}
});
