import test from 'node:test';import assert from 'node:assert/strict';import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';import {spawn} from 'node:child_process';import {once} from 'node:events';
test('server synchronizes the five-second next round and ends a threshold match without another countdown',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'fablewood-win-')),root=new URL('../',import.meta.url);let child;
 try{
  let source=await readFile(new URL('../server.mjs',import.meta.url),'utf8');source=source.replace(/from '(\.\/[^']+)'/g,(_,p)=>`from '${new URL(p,root).href}'`).replace("new URL('./public/',import.meta.url)",`new URL('${new URL('public/',root).href}')`);
  const marker="r.state=createGame(names,{...r.options,first:(r.round-(redeal?1:0))%names.length},random);";assert.ok(source.includes(marker));
  source=source.replace(marker,marker+`{const s=r.state,all=[...s.hands.flat(),...s.stock,s.cutCard].filter(Boolean),a=all.find(c=>c.id==='0-fox-2'),b=all.find(c=>c.id==='0-hare-3');s.hands=[[a],[b]];s.stock=all.filter(c=>c!==a&&c!==b);s.cutCard=null;s.turn=0;s.stage='meld';s.turns=4;s.opened=[true,false];if(!r.round&&r.options.winMode==='multi')r.totals=[0,200];}`);
  const file=join(dir,'server.mjs');await writeFile(file,source);child=spawn(process.execPath,[file],{env:{...process.env,PORT:'3031'},stdio:['ignore','pipe','pipe']});await Promise.race([once(child.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Startup timed out')),7000).unref())]);
  const api=async(endpoint,body,token)=>{if(body&&token){const current=await api('state?code='+body.code,null,token);body={revision:current.value.revision,...body};}const response=await fetch('http://127.0.0.1:3031/api/'+endpoint,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,value:await response.json()};};
  const created=(await api('create',{name:'Host'})).value,code=created.room.code,host=created.token,guest=(await api('join',{code,name:'Guest'})).value.token;
  assert.equal((await api('settings',{code,winTarget:401},host)).status,400);assert.equal((await api('settings',{code,winEnabled:true,winMode:'multi',winTarget:301},guest)).status,400);
  await api('settings',{code,winEnabled:true,winMode:'multi',winTarget:301},host);await api('start',{code},host);
  let room=(await api('action',{code,action:{type:'discard',ids:['0-fox-2']}},host)).value;assert.equal(room.state.winner,0);assert.deepEqual(room.totals,[-40,300]);assert.equal(room.matchWinners.length,0);assert.ok(room.nextRoundAt>Date.now()+4500);assert.equal(room.roundResults.length,1);
  assert.equal((await api('rematch',{code},host)).status,400);const peer=(await api('state?code='+code,null,guest)).value;assert.equal(peer.nextRoundAt,room.nextRoundAt);
  const began=Date.now();room=(await api('state?code='+code+'&since='+room.revision,null,guest)).value;assert.ok(Date.now()-began>=4400);assert.equal(room.round,2);assert.equal(room.state.winner,null);assert.equal(room.nextRoundAt,null);assert.deepEqual(room.totals,[-40,300]);
  room=(await api('action',{code,action:{type:'discard',ids:['0-fox-2']}},host)).value;assert.deepEqual(room.matchWinners,[0]);assert.equal(room.nextRoundAt,null);assert.equal(room.roundResults.length,2);assert.deepEqual(room.totals,[-80,400]);
  room=(await api('rematch',{code},host)).value;assert.deepEqual(room.totals,[0,0]);assert.deepEqual(room.roundResults,[]);assert.deepEqual(room.matchWinners,[]);
 }finally{if(child){child.kill();await once(child,'exit').catch(()=>{});}await rm(dir,{recursive:true,force:true});}
});
