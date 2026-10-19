import test,{before,after} from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {once} from 'node:events';
let child;
const api=async(endpoint,body,token)=>{const r=await fetch('http://127.0.0.1:3017/api/'+endpoint,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,value:await r.json()};};
const ordinary=hand=>hand.find(c=>c.id&&!c.joker).id;
async function online(){const created=await api('create',{name:'Host'}),code=created.value.room.code,host=created.value.token,guest=(await api('join',{code,name:'Guest'})).value.token;return {code,host,guest};}
before(async()=>{child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'3017'},stdio:['ignore','pipe','pipe']});await Promise.race([once(child.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Server startup timeout')),7000).unref())]);});
after(()=>child.kill());
test('a host leaving the lobby hands the first seat and host controls to the next player',async()=>{
 const {code,host,guest}=await online();
 assert.deepEqual((await api('leave',{code},host)).value,{left:true});
 const room=(await api('state?code='+code,null,guest)).value;
 assert.equal(room.you,0);assert.equal(room.host,0);assert.equal(room.players[0],'Guest');assert.equal(room.players[1],'');
 assert.equal((await api('settings',{code,timer:30},guest)).status,200);
 await api('leave',{code},guest);assert.equal((await api('join',{code,name:'Late'})).value.error,'Table not found.');
});
test('a host leaving a running game gives the seat to a bot and the host controls to a player',async()=>{
 const {code,host,guest}=await online();await api('start',{code},host);
 await api('leave',{code},host);
 const room=(await api('state?code='+code,null,guest));assert.equal(room.status,200);
 assert.equal(room.value.host,1);assert.equal(room.value.seatTypes[0],'bot');assert.equal(room.value.state.names[0],'Host');
 assert.equal(room.value.state.turn,1,'the bot finishes the turn the host left');assert.match(room.value.state.log.join('\n'),/Host left the table/);
 const drawn=await api('action',{code,action:{type:'draw',source:'stock'}},guest);
 const next=await api('action',{code,action:{type:'discard',ids:[ordinary(drawn.value.state.hands[1])]}},guest);
 assert.equal(next.value.state.turn,1,'the bot keeps playing its seat');
 await api('leave',{code},guest);assert.equal((await api('join',{code,name:'Late'})).value.error,'Table not found.');
});
test('a guest leaving while another player is on turn leaves that turn alone',async()=>{
 const {code,host,guest}=await online();await api('start',{code},host);
 await api('leave',{code},guest);
 let room=(await api('state?code='+code,null,host)).value;assert.equal(room.host,0);assert.equal(room.seatTypes[1],'bot');assert.equal(room.state.turn,0);assert.equal(room.state.stage,'meld');
 room=(await api('action',{code,action:{type:'discard',ids:[ordinary(room.state.hands[0])]}},host)).value;assert.equal(room.state.turn,0,'the bot plays the guest\'s turn');
 await api('leave',{code},host);
});
test('leaving a hot-seat game closes the table',async()=>{
 const created=await api('create',{name:'Host'}),code=created.value.room.code,host=created.value.token;
 await api('settings',{code,mode:'hotseat'},host);await api('start',{code},host);
 await api('leave',{code},host);assert.equal((await api('join',{code,name:'Late'})).value.error,'Table not found.');
});
test('leaving on your own turn after a discard draw that needs an opening lets the bot play on',async()=>{
 const {code,host,guest}=await online();let room=(await api('start',{code},host)).value;
 const turn=async(token,hand)=>(await api('action',{code,action:{type:'discard',ids:[ordinary(hand)]}},token)).value;
 room=await turn(host,room.state.hands[0]);
 room=(await api('action',{code,action:{type:'draw',source:'stock'}},guest)).value;room=await turn(guest,room.state.hands[1]);
 room=(await api('action',{code,action:{type:'draw',source:'stock'}},host)).value;room=await turn(host,room.state.hands[0]);
 room=(await api('action',{code,action:{type:'draw',source:'discard'}},guest)).value;assert.equal(room.state.mustOpen,true);
 assert.equal((await api('leave',{code},guest)).status,200);
 room=(await api('state?code='+code,null,host)).value;
 assert.equal(room.seatTypes[1],'bot');assert.equal(room.state.turn,0);assert.equal(room.state.mustOpen,false);
 await api('leave',{code},host);
});
