import test from 'node:test';import assert from 'node:assert/strict';import {createGame,play} from '../public/engine.js';
const c=(rank,suit='fox')=>({id:suit+rank,suit,rank});
const cards=[c(6),c(7),c(8),c(10),c(10,'hare'),c(10,'owl'),c(2,'toad')];
const ready=()=>({...createGame(['A','B']),turns:2,stage:'meld',hands:[structuredClone(cards),[]]});
const stage=(s,ids)=>play(s,0,{type:'stage-open',ids});
test('provisional opening reserves cards, blocks discard, and opens atomically at 51',()=>{
 const original=ready();let s=stage(original,cards.slice(0,3).map(c=>c.id));assert.equal(s.opened[0],false);assert.equal(s.openingAttempt.length,1);assert.equal(s.hands[0].length,7);assert.equal(s.melds.length,0);
 assert.throws(()=>play(s,0,{type:'discard',ids:[cards.at(-1).id]}),/opening attempt/);assert.throws(()=>stage(s,cards.slice(0,3).map(c=>c.id)),/already/);
 s=stage(s,cards.slice(3,6).map(c=>c.id));assert.equal(s.opened[0],true);assert.equal(s.openingAttempt.length,0);assert.equal(s.melds.length,2);assert.equal(s.hands[0].length,1);assert.equal(s.hands[0][0].id,cards.at(-1).id);assert.equal(original.melds.length,0);
 s=play(s,0,{type:'discard',ids:[cards.at(-1).id]});assert.equal(s.winner,0);assert.equal(s.handFinish,true);
});
test('reset and return-to-hand preserve the draw and any obligation to open',()=>{
 for(const forced of [false,true]){let s=ready();s.mustOpen=forced;s=stage(s,cards.slice(0,3).map(c=>c.id));const returned=play(s,0,{type:'unstage-open',index:0});assert.equal(returned.openingAttempt.length,0);assert.equal(returned.hands[0].length,7);
  s=play(s,0,{type:'reset-open'});assert.equal(s.openingAttempt.length,0);assert.equal(s.mustOpen,forced);assert.equal(s.stage,'meld');if(forced)assert.throws(()=>play(s,0,{type:'discard',ids:[cards.at(-1).id]}),/opening/);else assert.doesNotThrow(()=>play(s,0,{type:'discard',ids:[cards.at(-1).id]}));}
});
test('first lap, invalid groups, and using the final discard are rejected',()=>{
 let s=ready();s.turns=0;assert.throws(()=>stage(s,cards.slice(0,3).map(c=>c.id)),/first lap/);
 s=ready();assert.throws(()=>stage(s,[cards[0].id,cards[1].id]),/complete meld/);s.hands[0]=cards.slice(0,3);assert.throws(()=>stage(s,s.hands[0].map(c=>c.id)),/final discard/);
});
test('selected opening threshold and fixed joker placements are respected',()=>{
 let s=ready();s.options.opening=31;s=stage(s,cards.slice(3,6).map(c=>c.id));assert.equal(s.opened[0],false);s=stage(s,cards.slice(0,3).map(c=>c.id));assert.equal(s.opened[0],true);
 const joker={id:'joker-0',rank:0,suit:'joker',joker:true};s=ready();s.hands[0]=[c(5),c(6),joker,c(12,'owl')];s=play(s,0,{type:'stage-open',ids:[c(5).id,c(6).id,joker.id],assignments:{[joker.id]:{rank:7,suit:'fox'}}});assert.equal(s.openingAttempt[0].assignments[joker.id].rank,7);
});
