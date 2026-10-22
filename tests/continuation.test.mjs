import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

test('online continuation restores the saved turn privately and waits for exact player names',async()=>{
 const port='3035',base=`http://127.0.0.1:${port}`;
 const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:port,TABLE_RESUME_SECRET:'test-only-continuation-secret'},stdio:['ignore','pipe','pipe']});
 try{
  await Promise.race([once(child.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Server startup timeout')),7000).unref())]);
  const request=async(endpoint,body,token)=>{
   if(body&&token&&endpoint!=='state'&&endpoint!=='resume'){
    const current=await fetch(`${base}/api/state?code=${body.code}`,{headers:{Authorization:`Bearer ${token}`}});
    if(current.ok){const view=await current.json();body={revision:view.revision,...body};}
   }
   const response=await fetch(`${base}/api/${endpoint}`,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
   return {status:response.status,value:response.status===204?null:await response.json()};
  };
  const created=await request('create',{name:'Host'}),originalCode=created.value.room.code,host=created.value.token;
  const joined=await request('join',{code:originalCode,name:'Guest'}),guest=joined.value.token;
  const started=await request('start',{code:originalCode},host);
  const hostCard=started.value.state.hands[0].find(card=>!card.joker);
  const afterHostDiscard=await request('action',{code:originalCode,action:{type:'discard',ids:[hostCard.id]}},host);
  const guestAtTurnStart=await request(`state?code=${originalCode}`,null,guest);
  await request('action',{code:originalCode,action:{type:'draw',source:'stock'}},guest);
  const saved=await request('snapshot',{code:originalCode},host);
  assert.equal(saved.status,200);
  const continuation=saved.value.snapshot;
  assert.match(continuation,/^FWR1\./);
  assert.ok(continuation.length<22000);
  assert.equal(continuation.includes('Host'),false,'the opaque code does not expose player names');
  assert.equal((await request('resume',{snapshot:continuation,name:'host'})).status,400,'names must match exactly');

  const restoredHost=await request('resume',{snapshot:continuation,name:'Host'});
  assert.equal(restoredHost.status,200);
  const roomCode=restoredHost.value.room.code,hostToken=restoredHost.value.token,waiting=restoredHost.value.room;
  assert.notEqual(roomCode,originalCode,'continuation creates a fresh table');
  assert.equal(waiting.resumePending,true);
  assert.deepEqual(waiting.resumeWaiting,['Guest']);
  assert.equal(waiting.resumeTurnName,'Guest');
  assert.deepEqual(waiting.state.hands.map(hand=>hand[0]),[{hidden:true},{hidden:true}]);
  assert.deepEqual(waiting.options,started.value.options);
  assert.equal((await request('action',{code:roomCode,action:{type:'discard',ids:[]}},hostToken)).status,400,'play is blocked while original players are rejoining');

  const restoredGuest=await request('resume',{snapshot:continuation,name:'Guest'});
  assert.equal(restoredGuest.status,200);
  assert.equal(restoredGuest.value.room.code,roomCode);
  assert.equal(restoredGuest.value.room.resumePending,true,'all players see the reunion countdown before play restarts');
  assert.ok(restoredGuest.value.room.resumeCountdownAt>Date.now());
  assert.deepEqual(restoredGuest.value.room.players,['Host','Guest']);
  assert.equal(restoredGuest.value.room.state.turn,1);
  assert.equal(restoredGuest.value.room.state.stage,guestAtTurnStart.value.state.stage,'the continuation resumes at the beginning of the saved turn');
  assert.deepEqual(restoredGuest.value.room.state.hands.map(hand=>hand[0]),[{hidden:true},{hidden:true}]);
  await new Promise(resolve=>setTimeout(resolve,3150));
  const guestView=await request(`state?code=${roomCode}`,null,restoredGuest.value.token);
  assert.equal(guestView.value.resumePending,false);
  assert.deepEqual(guestView.value.state.hands[1],guestAtTurnStart.value.state.hands[1],'a draw made during the interrupted turn is rolled back');
  const hostView=await request(`state?code=${roomCode}`,null,hostToken);
  assert.deepEqual(hostView.value.state.hands[0],afterHostDiscard.value.state.hands[0]);
  assert.deepEqual(hostView.value.state.hands[1][0],{hidden:true});
  assert.equal(hostView.value.state.stock[0].hidden,true);
  await request('leave',{code:roomCode},hostToken);
  const noticeView=await request(`state?code=${roomCode}`,null,restoredGuest.value.token),notice=noticeView.value.notifications[0];
  assert.match(notice.message,/Host left the table\. Click to get a continuation code\./);
  assert.ok(notice.expiresAt>Date.now()&&notice.expiresAt<=Date.now()+10000);
  const copied=await request('notification-code',{code:roomCode,id:notice.id},restoredGuest.value.token);
  assert.match(copied.value.snapshot,/^FWR1\./);
  assert.deepEqual(copied.value.room.notifications,[]);
 }finally{child.kill();}
});
