import {test} from 'vitest';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {once} from 'node:events';
test('Rummikub selection, private racks, public staged tiles, turn ownership and switching back to Classic work through HTTP',async()=>{
 const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'0',HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']});
 try{const [line]=await Promise.race([once(child.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Startup timed out')),7000).unref())]),base=String(line).match(/http:\/\/127\.0\.0\.1:\d+/)[0];
 const api=async(endpoint,body,token)=>{if(body?.code&&token){const state=await fetch(base+'/api/state?code='+body.code,{headers:{Authorization:'Bearer '+token}}).then(r=>r.json());body={revision:state.revision,...body};}const r=await fetch(base+'/api/'+endpoint,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,value:await r.json()};};
 const expanded=(await api('create',{name:'Oak'})).value,ec=expanded.room.code,et=expanded.token;
 assert.equal((await api('settings',{code:ec,jokerCount:8},et)).value.options.jokerCount,8);
 assert.equal((await api('settings',{code:ec,jokerCount:6},et)).status,400);
 for(let i=2;i<6;i++)assert.equal((await api('seat',{code:ec,operation:'add',type:'human'},et)).status,200);
 assert.equal((await api('seat',{code:ec,operation:'add'},et)).status,400);
 assert.equal((await api('settings',{code:ec,variant:'rummikub',mode:'local'},et)).status,200);
 const six=await api('start',{code:ec},et);assert.equal(six.status,200);assert.equal(six.value.state.stock.length,76);assert.deepEqual(six.value.state.hands.map(h=>h.length),Array(6).fill(14));
 const host=(await api('create',{name:'Fern'})).value,code=host.room.code,token=host.token,guest=(await api('join',{code,name:'Moss'})).value;
 assert.equal((await api('settings',{code,variant:'rummikub'},guest.token)).status,400);
 let r=await api('settings',{code,variant:'rummikub'},token);assert.equal(r.value.options.opening,30);
 r=await api('settings',{code,opening:51,handSize:7},token);assert.equal(r.status,400);r=await api('settings',{code,opening:31,handSize:7},token);assert.equal(r.value.options.opening,31);assert.equal(r.value.options.handSize,7);
 r=await api('settings',{code,variant:'remi51'},token);assert.equal(r.value.options.opening,51);r=await api('settings',{code,variant:'rummikub'},token);
 r=await api('settings',{code,opening:31,handSize:7},token);r=await api('settings',{code,timer:0},token);assert.equal(r.value.options.opening,31);assert.equal(r.value.options.handSize,7);
 r=await api('start',{code},token);assert.equal(r.status,200);assert.deepEqual(r.value.state.hands.map(h=>h.length),[7,7]);assert.ok(r.value.state.hands[1].every(c=>c.hidden));assert.ok(r.value.state.stock.every(c=>c.hidden));assert.equal(r.value.state.stock.length,92);
 const tile=r.value.state.hands[0][0];r=await api('action',{code,action:{type:'field-stage',ids:[tile.id]}},token);assert.equal(r.status,200);assert.equal(r.value.state.fieldGroups[0].cards[0].id,tile.id);
 r=await api('state?code='+code,null,guest.token);assert.equal(r.value.state.fieldGroups[0].cards[0].id,tile.id);assert.equal(r.value.state.fieldGroups[0].ids,undefined);assert.ok(r.value.state.hands[0].every(c=>c.hidden));
 assert.equal((await api('action',{code,action:{type:'field-eject',index:0,id:tile.id}},guest.token)).status,400);
 assert.equal((await api('action',{code,action:{type:'rk-end'}},token)).status,400);
 r=await api('action',{code,action:{type:'draw',source:'stock'}},token);assert.equal(r.value.state.turn,1);assert.equal(r.value.state.hands[0].length,8);assert.equal(r.value.state.fieldGroups.length,0);
 }finally{child.kill();}
});
