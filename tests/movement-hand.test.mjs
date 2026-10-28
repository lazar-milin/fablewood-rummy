import {test} from 'vitest';import assert from 'node:assert/strict';
import {reconcileLayout,selectUnit,moveUnit,mergeUnits,ungroupUnit,ungroupCards,sortLayout} from '../public/movement-hand.js';
const c=(id,rank,suit='fox')=>({id,rank,suit});
test('ejecting one card leaves the rest grouped and returns only that card as a loose unit',()=>{
 const original=[['a','b','c'],['d']];assert.deepEqual(ungroupCards(original,['b']),[['a','c'],['b'],['d']]);assert.deepEqual(original,[['a','b','c'],['d']]);
 assert.deepEqual(ungroupCards(original,['a','b','c']),[['a'],['b'],['c'],['d']]);
});
test('arbitrary selections group without requiring a meld and movement preserves selection',()=>{
 const layout=[['a'],['b'],['c'],['d']],first=selectUnit(layout,[],0),pair=selectUnit(first.layout,first.selected,2);assert.deepEqual(pair.layout,[['a','c'],['b'],['d']]);assert.deepEqual(pair.selected,['a','c']);assert.deepEqual(selectUnit(pair.layout,pair.selected,0).selected,[]);
 const moved=moveUnit(pair.layout,0,3);assert.deepEqual(moved,[['b'],['d'],['a','c']]);assert.deepEqual(pair.selected,['a','c']);assert.deepEqual(ungroupUnit(moved,2),[['b'],['d'],['a'],['c']]);
});
test('manual order survives draws and repairs only removed or duplicate cards',()=>{
 const hand=['a','b','c','d'].map(id=>c(id,2));assert.deepEqual(reconcileLayout([['c','a'],['b','a'],['gone']],hand),[['c','a'],['b'],['d']]);assert.deepEqual(mergeUnits([['a'],['b','c'],['d']],0,1),[['b','c','a'],['d']]);
});
test('one-shot animal sort leads with sets; value sort leads with runs',()=>{
 const hand=[c('f8',8),c('h8',8,'hare'),c('t8',8,'toad'),c('o1',1,'owl'),c('f2',2),c('f3',3),c('f4',4)],layout=[['o1'],['f2','f3','f4'],['f8','h8','t8']];
 assert.deepEqual(sortLayout(layout,hand,'animal')[0],['f8','h8','t8']);assert.deepEqual(sortLayout(layout,hand,'value')[0],['f2','f3','f4']);assert.deepEqual(layout,[['o1'],['f2','f3','f4'],['f8','h8','t8']]);
 const sorted=sortLayout(layout,hand,'animal');assert.deepEqual(reconcileLayout(sorted,[...hand,c('new',1)]).at(-1),['new']);
});
