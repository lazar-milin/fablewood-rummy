import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {once} from 'node:events';
test('undo stays inside your own turn and never reveals the stock',async()=>{
 const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'3015'},stdio:['ignore','pipe','pipe']});
 try{await Promise.race([once(child.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Server startup timeout')),7000).unref())]);
 const api=async(endpoint,body,token)=>{if(body&&token&&endpoint!=='state'&&endpoint!=='join'){const state=await fetch('http://127.0.0.1:3015/api/state?code='+body.code,{headers:{Authorization:'Bearer '+token}}).then(r=>r.json());body={revision:state.revision,...body};}const r=await fetch('http://127.0.0.1:3015/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});return {status:r.status,value:await r.json()};};
 const created=await api('create',{name:'Host'}),code=created.value.room.code,host=created.value.token;
 const guest=(await api('join',{code,name:'Guest'})).value.token;
 const started=await api('start',{code},host);assert.equal(started.value.canUndo,false);
 const discard=started.value.state.hands[0].find(c=>!c.joker);
 const passed=await api('action',{code,action:{type:'discard',ids:[discard.id]}},host);assert.equal(passed.value.state.turn,1);assert.equal(passed.value.canUndo,false);
 assert.equal((await api('undo',{code},host)).status,400,'the host cannot take back a discard the guest has seen');
 const fromDiscard=await api('action',{code,action:{type:'draw',source:'discard'}},guest);assert.equal(fromDiscard.value.canUndo,true);
 const undone=await api('undo',{code},guest);assert.equal(undone.status,200,'a draw from the face-up discard can still be undone');assert.equal(undone.value.state.stage,'draw');
 const fromStock=await api('action',{code,action:{type:'draw',source:'stock'}},guest);assert.equal(fromStock.status,200);assert.equal(fromStock.value.canUndo,false);
 assert.equal((await api('undo',{code},guest)).status,400,'a stock draw cannot be undone to peek at the card');
 }finally{child.kill();}
});
