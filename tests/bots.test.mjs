import {test} from 'vitest';import assert from 'node:assert/strict';
import {createGame,play,botAction,botDiscard} from '../public/engine.js';
const c=(rank,suit='fox',d=0)=>({id:`${d}-${suit}-${rank}`,rank,suit}),j=(i=0)=>({id:'joker-'+i,rank:0,suit:'joker',joker:true});
// Small seeded generator so a failing random game can be replayed.
const seeded=seed=>()=>{seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const everyCard=s=>[...s.hands.flat(),...s.stock,...s.discard,...s.melds.flatMap(m=>m.cards),...(s.cutCard?[s.cutCard]:[])];
test('a bot never opens below the minimum while keeping a joker the table forbids in a hand finish',()=>{
 const s=createGame(['Human','Bot'],{handSize:7,handRequiresOpening:false,handJokers:false});s.turns=2;s.turn=1;s.stage='meld';
 s.hands[1]=[c(3,'hare'),c(4,'hare'),c(5,'hare'),c(6,'hare'),c(7,'hare'),c(7,'toad'),c(7,'owl'),j()];
 assert.doesNotThrow(()=>play(s,1,botAction(s)));
});
test('the fallback discard buries a reclaimed joker so a stuck turn can always end',()=>{
 const s=createGame(['Human','Bot']);s.turns=2;s.turn=1;s.stage='meld';s.opened[1]=true;s.hands[1]=[c(2,'hare'),c(9,'owl'),j()];s.pendingJokers=[j().id];
 const next=play(s,1,botDiscard(s));assert.equal(next.pendingJokers.length,0);assert.equal(next.turn,0);
});
test('bots finish games under random table options without illegal moves',()=>{
 const random=seeded(51),pick=a=>a[Math.floor(random()*a.length)];
 for(let game=0;game<30;game++){
  const n=2+Math.floor(random()*5),options={handSize:7+Math.floor(random()*8),opening:pick([31,51]),aceMode:pick(['both','low','high']),jokerEnds:pick([true,false]),handEnabled:pick([true,false]),handRequiresOpening:pick([true,false]),handJokers:pick([true,false]),cutEnabled:pick([true,false]),first:Math.floor(random()*n)};
  let s=createGame(Array.from({length:n},(_,i)=>'P'+i),options,random);
  for(let move=0;move<5000&&s.winner===null;move++){const action=botAction(s);try{s=play(s,s.turn,action);}catch(e){assert.fail(`game ${game} ${JSON.stringify(options)}: ${e.message} for ${JSON.stringify(action)}`);}}
  const all=everyCard(s);assert.equal(all.length,108);assert.equal(new Set(all.map(c=>c.id)).size,108);
 }
});
