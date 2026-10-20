import test from 'node:test';import assert from 'node:assert/strict';
import {createBotScheduler} from '../bot-scheduler.mjs';import {describeMove,unseenMoves} from '../public/move-events.js';import {mergeUnits} from '../public/movement-hand.js';import {capsuleGlyphs} from '../public/group-glyphs.js';
test('bot phases wait two seconds, publish separately, and cannot acquire duplicate timers',()=>{
 const room={bot:true},timers=new Map();let serial=0,now=0,events=[];
 const scheduler=createBotScheduler({isCurrent:r=>r===room,isBot:r=>r.bot,advance:r=>{events.push(now);if(now===4000)r.bot=false;},publish:()=>events.push('published'),schedule:(fn,delay)=>{const id=++serial;timers.set(id,{fn,at:now+delay});return id;},cancel:id=>timers.delete(id)});
 scheduler.queue(room);scheduler.queue(room);assert.equal(timers.size,1);assert.equal([...timers.values()][0].at,2000);
 const tick=()=>{const [id,timer]=timers.entries().next().value;timers.delete(id);now=timer.at;timer.fn();};
 tick();assert.deepEqual(events,[2000,'published']);assert.equal([...timers.values()][0].at,4000);tick();assert.deepEqual(events,[2000,'published',4000,'published']);assert.equal(timers.size,0);
 room.bot=true;scheduler.queue(room);scheduler.stop(room);assert.equal(timers.size,0);
});
test('stock animation never exposes the drawn face, while public plays identify the acting player',()=>{
 const before={turn:1,stage:'draw',hands:[[],[]],discard:[],melds:[],openingAttempt:[]},card={id:'secret',rank:7,suit:'fox'};
 const after={...before,stage:'meld',hands:[[],[card]]};assert.deepEqual(describeMove(before,after),[{player:1,from:{zone:'stock'},to:{zone:'player',index:1},card:null}]);
 const played={...after,hands:[[],[]],melds:[{owner:0,cards:[card]}]};assert.equal(describeMove(after,played)[0].player,1);assert.equal(describeMove(after,played)[0].card,card);
 const discarded={...after,discard:[card]};assert.equal(describeMove(after,discarded)[0].to.zone,'discard');
});
test('remote animations skip local human actions, old events, and previous rounds',()=>{
 const moves=[{id:1,player:0,to:{zone:'meld'}},{id:2,player:1,to:{zone:'meld'}},{id:3,player:2,to:{zone:'meld'}}],base={state:{},round:1,moves:[moves[0]]},next={state:{},round:1,moves,seatTypes:['human','human','bot'],mode:'online',you:1};
 assert.deepEqual(unseenMoves(base,next),[moves[2]]);assert.deepEqual(unseenMoves(base,{...next,mode:'hotseat'}),[moves[2]]);assert.deepEqual(unseenMoves(base,{...next,round:2}),[]);
});
test('hover insertion merges cards at the chosen gap without changing other units',()=>{
 const layout=[['a'],['b','c','d'],['e']];assert.deepEqual(mergeUnits(layout,0,1,1),[['b','a','c','d'],['e']]);assert.deepEqual(mergeUnits(layout,2,1,0),[['a'],['e','b','c','d']]);assert.deepEqual(layout,[['a'],['b','c','d'],['e']]);
});
test('character borders follow measured group bounds with dense card-back glyphs',()=>{
 const small=capsuleGlyphs(140,160,'a'),large=capsuleGlyphs(300,160,'b');assert.match(small,/viewBox="0 0 146 166"/);const letters=s=>s.match(/lengthAdjust="spacing">([^<]+)/)[1];assert.match(letters(small),/^[- x+I]+$/);assert.ok(letters(large).length>letters(small).length);assert.ok(letters(small).length>100);
});

test('local draws use the private new card and fly into the hand; local discards leave the hand',()=>{
 const card={id:'private-new',rank:6,suit:'fox'},old={id:'old'},previous={round:1,state:{hands:[[old]]},moves:[]},next={round:1,you:0,mode:'online',seatTypes:['human'],state:{hands:[[old,card]]},moves:[{id:1,player:0,from:{zone:'stock'},to:{zone:'player',index:0},card:null}]};
 assert.deepEqual(unseenMoves(previous,next)[0].to,{zone:'hand',index:0});assert.equal(unseenMoves(previous,next)[0].card,card);assert.equal(next.moves[0].card,null);
 const discarded={...next,moves:[{id:2,player:0,from:{zone:'player',index:0},to:{zone:'discard'},card}]};assert.equal(unseenMoves(next,discarded)[0].from.zone,'hand');
 assert.equal(unseenMoves(previous,{...next,mode:'hotseat'})[0].to.zone,'hand');
});

test('drawing from a reshuffled stock remains anonymous and does not animate the retained top discard',()=>{const top={id:'top',suit:'fox',rank:4},older={id:'older',suit:'hare',rank:3},before={turn:0,stage:'draw',hands:[[]],stock:[],discard:[older,top],melds:[]},after={...before,stage:'meld',hands:[[older]],discard:[top]};const events=describeMove(before,after);assert.equal(events[0].from.zone,'stock');assert.equal(events[0].card,null);});
