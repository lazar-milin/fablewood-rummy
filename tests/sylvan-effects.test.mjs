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
