import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,play,resolveMeld,meldChoices,botAction} from '../public/engine.js';
import {chooseCard,selectedOpeningInfo} from '../public/packing.js';
const c=(rank,suit='fox')=>({id:suit+rank,suit,rank}),j=i=>({id:'joker-'+i,suit:'joker',rank:0,joker:true});
const ready=hand=>({...createGame(['A','B']),turns:2,stage:'meld',opened:[true,false],hands:[hand,[]]});
test('either missing animal may extend or replace a set joker without duplicates',()=>{
 for(const suit of ['toad','owl']){
  const m={...resolveMeld([c(7),c(7,'hare'),j(0)]),owner:1};
  let s=ready([c(7,suit),c(2)]);s.melds=[m];
  const grown=play(s,0,{type:'layoff',index:0,ids:[c(7,suit).id]});assert.equal(grown.melds[0].cards.length,4);assert.notEqual(grown.melds[0].cards.find(c=>c.joker).as.suit,suit);
  const swapped=play(s,0,{type:'replace',index:0,jokerId:j(0).id,ids:[c(7,suit).id]});assert.ok(swapped.hands[0].some(c=>c.id===j(0).id&&!c.as));assert.deepEqual(swapped.pendingJokers,[j(0).id]);
 }
 const s=ready([{...c(7),id:'duplicate'},c(2)]);s.melds=[{...resolveMeld([c(7),c(7,'hare'),j(0)]),owner:1}];assert.throws(()=>play(s,0,{type:'replace',index:0,jokerId:j(0).id,ids:['duplicate']}));
});
test('a declared run joker stays at the chosen end during additions and swaps',()=>{
 const cards=[c(5),c(6),j(0)],choices=meldChoices(cards);assert.deepEqual(choices.map(m=>m.cards.find(c=>c.joker).as.rank).sort(),[4,7]);
 let s=ready([...cards,c(4),c(7),c(9)]);s=play(s,0,{type:'meld',ids:cards.map(c=>c.id),assignments:{[j(0).id]:{rank:7,suit:'fox'}}});
 assert.equal(s.melds[0].cards.find(c=>c.joker).as.rank,7);s=play(s,0,{type:'layoff',index:0,ids:[c(4).id]});assert.equal(s.melds[0].cards[0].rank,4);
 assert.throws(()=>play(s,0,{type:'replace',index:0,jokerId:j(0).id,ids:[c(9).id]}));s=play(s,0,{type:'replace',index:0,jokerId:j(0).id,ids:[c(7).id]});assert.ok(s.hands[0].some(c=>c.id===j(0).id));
 for(const assignments of [{[j(0).id]:{rank:13,suit:'fox'}},{[c(5).id]:{rank:7,suit:'fox'}},{[j(0).id]:{rank:7,suit:'bogus'}}])assert.throws(()=>play(ready([...cards,c(9)]),0,{type:'meld',ids:cards.map(c=>c.id),assignments}));
 assert.equal(meldChoices(cards,{rules:{jokerEnds:false}}).length,0);
});
test('multiple jokers work after opening for people and bots, but not in an opening group',()=>{
 const cards=[c(5),j(0),j(1)],s=ready([...cards,c(12,'owl')]);
 assert.equal(play(s,0,{type:'meld',ids:cards.map(c=>c.id)}).melds[0].cards.length,3);
 const move=botAction(s);assert.equal(move.type,'meld');assert.doesNotThrow(()=>play(s,0,move));
 s.opened[0]=false;assert.throws(()=>play(s,0,{type:'open',groups:[cards.map(c=>c.id)]}));
 let pack={groups:[],selected:[]};for(const card of cards)pack=chooseCard(s.hands[0],pack.groups,pack.selected,card.id,{openingMeld:false});assert.equal(pack.groups.length,1);
});
test('opening readiness includes a higher-value legal joker placement',()=>{
 const hand=[c(5),c(6),j(0),c(10,'hare'),c(11,'hare'),c(12,'hare'),c(2,'owl')],groups=[hand.slice(0,3).map(c=>c.id),hand.slice(3,6).map(c=>c.id)];
 const info=selectedOpeningInfo(hand,groups,groups.flat(),{opening:47});assert.equal(info.points,48);assert.equal(info.canOpen,true);
 const s=ready(hand);s.opened[0]=false;s.options.opening=47;
 const next=play(s,0,{type:'open',groups,assignments:{[j(0).id]:{rank:7,suit:'fox'}}});assert.equal(next.opened[0],true);assert.equal(next.melds[0].points,18);
});
