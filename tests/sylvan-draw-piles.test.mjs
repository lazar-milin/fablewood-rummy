import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,play} from '../public/engine.js';

const card=(id,rank,suit='fox')=>({id,rank,suit});
function ready(handSize=7){
 const state=createGame(['A','B'],{variant:'hunt-escape'},()=>0.37);
 state.turn=0;state.turns=4;state.stage='draw';state.roles[0]='hunt';state.opened[0]=true;
 state.hands[0]=Array.from({length:handSize},(_,index)=>card(`hand-${index}`,index+1));
 state.stock=Array.from({length:18},(_,index)=>card(`stock-${index}`,(index%13)+1,'hare'));
 state.discardPiles=[[card('buried-0',4),card('top-0',5)],[card('buried-1',6),card('top-1',7,'owl')]];
 return state;
}

test('one draw phase can take one top card from each pile without auto-drawing from the pool',()=>{
 const state=ready(),pool=state.stock.length;
 let next=play(state,0,{type:'draw',source:'discard-0'});
 assert.equal(next.stage,'draw');assert.equal(next.hands[0].length,8);assert.equal(next.stock.length,pool);
 assert.equal(next.discardPiles[0].at(-1).id,'buried-0');assert.equal(next.discardPiles[0].at(-1).protectedByExposure,true);
 assert.throws(()=>play(next,0,{type:'draw',source:'discard-0'}),/protected/);
 next=play(next,0,{type:'draw',source:'discard-1'});
 assert.equal(next.stage,'meld');assert.equal(next.hands[0].length,9);assert.equal(next.stock.length,pool);
 assert.equal(next.discardPiles[1].at(-1).protectedByExposure,true);
});

test('pool drawing after a pile pickup explicitly fills the hand to seven',()=>{
 const state=ready(5),pool=state.stock.length;
 let next=play(state,0,{type:'draw',source:'discard-0'});
 assert.equal(next.stage,'draw');assert.equal(next.stock.length,pool);assert.equal(next.hands[0].length,6);
 next=play(next,0,{type:'draw',source:'stock'});
 assert.equal(next.stage,'meld');assert.equal(next.hands[0].length,7);assert.equal(next.stock.length,pool-1);
});

test('a new cleanse clears only prior exposed-card protection',()=>{
 const state=ready();state.discardPiles[0][0]=card('buried-q',12);let next=play(state,0,{type:'draw',source:'discard-0'});
 assert.equal(next.discardPiles[0].at(-1).protected,true);
 next.stage='meld';next.hands[0]=[card('new-a',2,'hare'),card('new-b',3,'hare')];
 next=play(next,0,{type:'discard',ids:['new-a','new-b']});
 assert.notEqual(next.discardPiles[0].find(item=>item.id==='buried-q').protected,true);
 assert.equal(next.discardPiles[0].at(-1).protected,undefined);
});

test('a protected special card stays visible on top when several cards enter its pile',()=>{
 const state=ready(7);state.discardRequired=3;state.stage='meld';state.hands[0]=[card('q',12),card('plain-a',2,'hare'),card('plain-b',3,'hare'),...Array.from({length:4},(_,i)=>card(`spare-${i}`,8+i%4))];
 const next=play(state,0,{type:'discard',ids:['q','plain-a','plain-b']});
 assert.equal(next.discardPiles[0].at(-1).id,'q');assert.equal(next.discardPiles[0].at(-1).protected,true);
});

test('the second-turn discard option remains a one-card no-pool choice',()=>{
 const state=ready();state.turns=2;const pool=state.stock.length;
 const next=play(state,0,{type:'draw',source:'discard-0'});
 assert.equal(next.stage,'meld');assert.equal(next.hands[0].length,8);assert.equal(next.stock.length,pool);
});

test('Joker, H, Q and E protect their pile from single and grouped cleanses',()=>{
 for(const protector of [{id:'joker-x',joker:true,suit:'joker',rank:0},card('h',10),card('q',12),card('e',13)]){
  const single=ready();single.stage='meld';single.bonusDiscard=1;single.hands[0]=[protector,card('spare',2,'hare'),card('spare-b',3,'hare')];
  const afterSingle=play(single,0,{type:'bonus-discard',ids:[protector.id]});
  assert.equal(afterSingle.discardPiles[0].at(-1).id,protector.id,`${protector.id} tops its pile`);assert.equal(afterSingle.discardPiles[0].at(-1).protected,true,`${protector.id} protects a single cleanse`);
  for(const position of [0,1,2]){
   const grouped=ready();grouped.stage='meld';grouped.discardRequired=3;const plain=[card('plain-a',2,'hare'),card('plain-b',3,'hare')],cards=[...plain];cards.splice(position,0,protector);grouped.hands[0]=[...cards,card('keep',9,'toad')];
   const next=play(grouped,0,{type:'discard',ids:cards.map(item=>item.id)}),pile=next.discardPiles.find(stack=>stack.some(item=>item.id===protector.id));
   assert.equal(pile.at(-1).id,protector.id,`${protector.id} at position ${position} moves to the top`);assert.equal(pile.at(-1).protected,true);
   const taker=structuredClone(next);taker.stage='draw';taker.opened[1]=true;taker.turns=6;const index=next.discardPiles.indexOf(pile);
   assert.throws(()=>play(taker,1,{type:'draw',source:`discard-${index}`}),/protected/);
  }
 }
});

test('protection lasts until its own pile receives a new cleanse',()=>{
 const state=ready();state.stage='meld';state.hands[0]=[card('q',12),card('e',13,'owl'),card('keep',9,'toad')];
 let next=play(state,0,{type:'discard',ids:['q','e']});assert.ok(next.discardPiles.every(pile=>pile.at(-1).protected));
 // A Diversion cleanse reaches only the first pile, so the second keeps its E protection.
 next.turn=1;next.stage='meld';next.bonusDiscard=1;next.hands[1]=[card('plain',4,'hare'),card('x',5,'hare'),card('y',6,'hare')];
 next=play(next,1,{type:'bonus-discard',ids:['plain']});
 assert.equal(next.discardPiles[0].at(-1).id,'plain');assert.notEqual(next.discardPiles[0].at(-1).protected,true);assert.notEqual(next.discardPiles[0].find(item=>item.id==='q').protected,true);
 assert.equal(next.discardPiles[1].at(-1).id,'e');assert.equal(next.discardPiles[1].at(-1).protected,true);
 // Ending a turn without cleansing leaves both piles as they were.
 next.skipDiscard=true;next=play(next,1,{type:'discard',ids:[]});assert.equal(next.discardPiles[1].at(-1).protected,true);
});
