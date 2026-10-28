import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,play} from '../public/engine.js';
import {newlyArisenCards} from '../public/arise-events.js';

const card=(id,rank,suit='fox')=>({id,rank,suit});

test('Sylvan cleanse indicators show every effect, stay through the affected turn, and replace only on completion',()=>{
 const state=createGame(['A','B'],{variant:'hunt-escape'},()=>0.37);
 state.turn=0;state.turns=2;state.stage='meld';state.roles[0]='hunt';
 const hurry=card('hurry',10),quench=card('quench',12,'owl');state.hands[0]=[hurry,quench];
 let next=play(state,0,{type:'discard',ids:[hurry.id,quench.id]});
 assert.deepEqual(next.cleanseIndicators.map(pile=>pile.map(item=>item.effect)),[['Hurry'],['Quench']]);
 assert.deepEqual(next.cleanseIndicators.map(pile=>pile.map(item=>item.scope)),[['next'],['next']]);
 assert.equal(next.discardPiles[0].at(-1).protected,true);
 assert.equal(next.discardPiles[1].at(-1).protected,true);

 next.stage='meld';next.discardRequired=3;next.hands[1]=[card('a',2,'hare'),card('b',3,'hare'),card('c',4,'hare')];
 next=play(next,1,{type:'stage-discard',ids:['a']});
 assert.deepEqual(next.cleanseIndicators.map(pile=>pile.map(item=>item.effect)),[['Hurry'],['Quench']]);
 next=play(next,1,{type:'stage-discard',ids:['b','c']});
 assert.deepEqual(next.cleanseIndicators,[[],[]]);
});

test('a Quenched mandatory cleanse does not activate Arise for an Ace',()=>{
 const state=createGame(['A','B'],{variant:'hunt-escape'},()=>0.37);
 state.turn=0;state.turns=2;state.stage='meld';state.roles[0]='hunt';state.discardRequired=4;
 const cards=[card('ace',1,'hare'),card('two',2,'hare'),card('three',3,'hare'),card('four',4,'hare')];
 state.hands[0]=cards;
 const next=play(state,0,{type:'discard',ids:cards.map(item=>item.id)});
 assert.ok(next.discardPiles.some(pile=>pile.some(item=>item.id==='ace')));
 assert.equal(next.hands[0].some(item=>item.id==='ace'),false);
 assert.ok(next.cleanseIndicators.flat().every(item=>item.effect!=='Arise'));
});

test('Arise returns produce a fresh event even when that Ace previously glowed',()=>{
 const ace={id:'ace',rank:1,suit:'hare',effectGlow:'arise',effectGlowUntil:1000};
 const before={turn:0,hands:[[ace],[]]},returned={...ace,effectGlowUntil:3201};
 assert.deepEqual(newlyArisenCards(before,{turn:0,hands:[[returned],[]]}),[returned]);
 assert.deepEqual(newlyArisenCards({turn:0,hands:[[returned],[]]},{turn:0,hands:[[returned],[]]}),[]);
});

test('public Arise events animate for clients whose view hides the acting player hand',()=>{
 const ace={id:'ace',rank:1,suit:'hare',effectGlow:'arise',effectGlowUntil:9000,effectGlowPile:1},before={turn:0,hands:[[{hidden:true}],[]]},after={turn:0,hands:[[{hidden:true}],[]],ariseEvent:{sequence:1,player:0,cards:[ace]}};
 assert.deepEqual(newlyArisenCards(before,after),[ace]);
 assert.deepEqual(newlyArisenCards(after,{...after,hands:[[{hidden:true}],[]]}),[]);
});

test('every Ace in a staged Quenched cleanse is lost, counts toward four, and drops any old Arise glow',()=>{
 const state=createGame(['A','B'],{variant:'hunt-escape'},()=>0.37);
 state.turn=0;state.turns=4;state.stage='meld';state.roles[0]='hunt';state.discardRequired=4;
 const old={...card('ace',1,'hare'),effectGlow:'arise',effectGlowUntil:Date.now()+9000,effectGlowPile:1};
 state.hands[0]=[old,card('ace-b',1,'toad'),card('two',2,'hare'),card('three',3,'hare'),card('keep',9)];
 let next=play(state,0,{type:'stage-discard',ids:['ace']});
 next=play(next,0,{type:'stage-discard',ids:['ace-b','two','three']});
 assert.equal(next.turn,1,'the Aces count toward the four');
 assert.deepEqual(next.hands[0].map(item=>item.id),['keep']);
 const lost=next.discardPiles.flat().filter(item=>item.rank===1);
 assert.equal(lost.length,2);assert.ok(lost.every(item=>item.effectGlow===undefined&&item.effectGlowUntil===undefined));
 assert.equal(next.ariseEvent,undefined);assert.ok(next.log.some(line=>line.includes('Quenched cleanse lost 2 Aces')));
});

test('an Ace cleansed for a Diversion during a Quenched turn still Arises',()=>{
 const state=createGame(['A','B'],{variant:'hunt-escape'},()=>0.37);
 state.turn=0;state.turns=4;state.stage='meld';state.roles[0]='hunt';state.discardRequired=4;state.bonusDiscard=1;
 state.hands[0]=[card('ace',1,'hare'),card('a',2,'hare'),card('b',3,'hare'),card('c',4,'hare'),card('d',5,'hare')];
 const next=play(state,0,{type:'bonus-discard',ids:['ace']});
 assert.ok(next.hands[0].some(item=>item.id==='ace'&&item.effectGlow==='arise'));assert.equal(next.discardRequired,4);
});
