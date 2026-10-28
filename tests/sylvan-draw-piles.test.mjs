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
