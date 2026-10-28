import {test} from 'vitest';import assert from 'node:assert/strict';
import {createGame,play} from '../public/engine.js';
const id=(rank,suit='fox')=>`0-${suit}-${rank}`;
const fixture=[id(6),id(7),id(8),id(10),id(10,'hare'),id(10,'owl'),id(2,'toad')];
function ready(ids=fixture){const s=createGame(['A','B']),all=[...s.hands.flat(),...s.stock,s.cutCard];return {...s,hands:[ids.map(id=>all.find(c=>c.id===id)),[]],stock:all.filter(c=>!ids.includes(c.id)),cutCard:null,turns:2,stage:'meld'};}
const act=(s,type,data={})=>play(s,0,{type,...data});
const stage=(s,ids)=>act(s,'field-stage',{ids});
function conserved(s){const cards=[...s.hands.flat(),...s.stock,...s.discard,...s.melds.flatMap(m=>m.cards),...(s.cutCard?[s.cutCard]:[])];assert.equal(cards.length,108);assert.equal(new Set(cards.map(c=>c.id)).size,108);for(const g of s.fieldGroups)for(const card of g.ids)assert.ok(s.hands[g.owner].some(c=>c.id===card));}

test('single cards form a provisional run, then two valid groups open atomically at 51',()=>{
 let s=ready();s=stage(s,[id(6)]);s=act(s,'field-merge',{index:0,ids:[id(7)]});assert.equal(s.fieldGroups[0].ids.length,2);
 s=act(s,'field-merge',{index:0,ids:[id(8)]});assert.equal(s.opened[0],false);assert.equal(s.melds.length,0);conserved(s);
 s=stage(s,fixture.slice(3,6));assert.equal(s.opened[0],true);assert.equal(s.fieldGroups.length,0);assert.equal(s.melds.length,2);assert.equal(s.hands[0].length,1);conserved(s);
});
test('field selection merges groups, and removing one card leaves it unreserved in hand',()=>{
 let s=ready();s=stage(s,[id(6)]);s=stage(s,[id(7)]);s=act(s,'field-group',{indices:[0,1]});assert.deepEqual(s.fieldGroups[0].ids,[id(6),id(7)]);
 s=act(s,'field-merge',{index:0,ids:[id(8)]});s=act(s,'field-eject',{index:0,id:id(7)});assert.deepEqual(s.fieldGroups[0].ids,[id(6),id(8)]);assert.ok(s.hands[0].some(c=>c.id===id(7)));conserved(s);
 s=act(s,'field-return',{index:0});assert.equal(s.fieldGroups.length,0);conserved(s);
});
test('field gaps reorder units without duplicating cards and an empty discard attempt still returns drafts',()=>{
 let s=ready();s=stage(s,[id(6)]);s=stage(s,[id(7)]);s=act(s,'field-stage',{ids:[id(8)],before:0});assert.deepEqual(s.fieldGroups.map(g=>g.ids),[[id(8)],[id(6)],[id(7)]]);
 s=act(s,'field-reorder',{index:0,before:3});assert.deepEqual(s.fieldGroups.map(g=>g.ids),[[id(6)],[id(7)],[id(8)]]);conserved(s);
 s=act(s,'field-play',{ids:[],move:{type:'discard'}});assert.equal(s.fieldGroups.length,0);assert.equal(s.turn,0);assert.ok(s.fieldNotice);conserved(s);
});
test('after opening, a group built card by card becomes a permanent meld automatically',()=>{
 let s=ready();s.opened[0]=true;s=stage(s,[id(6)]);s=act(s,'field-merge',{index:0,ids:[id(7)]});s=act(s,'field-merge',{index:0,ids:[id(8)]});assert.equal(s.fieldGroups.length,0);assert.equal(s.melds.length,1);conserved(s);
});
test('an invalid drop on a permanent meld returns the source draft without changing that meld',()=>{
 let s=ready([...fixture,id(9)]);s.opened[0]=true;s=stage(s,fixture.slice(0,3));s=stage(s,[id(2,'toad')]);
 s=act(s,'field-play',{source:0,move:{type:'layoff',index:0}});assert.equal(s.fieldGroups.length,0);assert.equal(s.melds[0].cards.length,3);assert.match(s.fieldNotice,/extend/);assert.ok(s.hands[0].some(c=>c.id===id(2,'toad')));conserved(s);
 s=stage(s,[id(9)]);s=act(s,'field-play',{source:0,move:{type:'layoff',index:0}});assert.equal(s.melds[0].cards.length,4);assert.equal(s.fieldNotice,null);conserved(s);
});
test('discard returns unfinished groups and ends the turn, while an illegal discard returns them and preserves the turn',()=>{
 for(const illegal of [false,true]){let s=stage(ready(),fixture.slice(0,2));s=act(s,'field-play',{ids:illegal?fixture.slice(3,5):[fixture.at(-1)],move:{type:'discard'}});assert.equal(s.fieldGroups.length,0);assert.equal(s.turn,illegal?0:1);assert.equal(!!s.fieldNotice,illegal);conserved(s);}
 let s=stage(ready(),fixture.slice(0,2));s.mustOpen=true;s=act(s,'field-play',{ids:[fixture.at(-1)],move:{type:'discard'}});assert.equal(s.fieldGroups.length,0);assert.equal(s.turn,0);assert.equal(s.mustOpen,true);assert.match(s.fieldNotice,/requires an opening/);conserved(s);
});
test('first lap, drawing first, ownership, duplicate reservations and the final discard remain protected',()=>{
 let s=ready();s.turns=0;assert.throws(()=>stage(s,[id(6)]),/first lap/);s=ready();s.stage='draw';assert.throws(()=>stage(s,[id(6)]),/Draw/);
 s=stage(ready(),[id(6)]);assert.throws(()=>stage(s,[id(6)]),/already/);assert.throws(()=>play(s,1,{type:'field-return',index:0}),/turn/);assert.throws(()=>act(s,'meld',{ids:fixture.slice(0,3)}),/Return/);conserved(s);
 s=ready(fixture.slice(0,3));s.options.opening=20;s=stage(s,fixture.slice(0,3));assert.equal(s.melds.length,0);assert.equal(s.fieldGroups.length,0);assert.match(s.fieldNotice,/final discard/);conserved(s);
});
