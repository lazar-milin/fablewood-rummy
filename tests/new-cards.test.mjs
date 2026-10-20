import test from 'node:test';import assert from 'node:assert/strict';
import {updateNewCards,acknowledgeCards,markReturnedCards} from '../public/new-cards.js';
test('the deal is not new, but a drawn or reclaimed card is marked once',()=>{
 let state=updateNewCards(null,['a','b']);assert.deepEqual(state.fresh,[]);
 state=updateNewCards(state,['a','b','drawn']);assert.deepEqual(state.fresh,['drawn']);
 state=updateNewCards(state,['b','drawn','joker']);assert.deepEqual(state.fresh,['drawn','joker']);
 state=updateNewCards(state,['b','drawn','joker']);assert.deepEqual(state.fresh,['drawn','joker']);
});
test('hover, click or move acknowledgement survives refresh and later updates',()=>{
 let state=updateNewCards(updateNewCards(null,['a']),['a','b','c']);state=acknowledgeCards(state,['b']);assert.deepEqual(state.fresh,['c']);
 state=updateNewCards(JSON.parse(JSON.stringify(state)),['a','b','c']);assert.deepEqual(state.fresh,['c']);
 state=acknowledgeCards(state,['a','b','c']);assert.deepEqual(state.fresh,[]);
});
test('leaving the hand removes a marker and a later return becomes new again',()=>{
 let state=updateNewCards(updateNewCards(null,['a']),['a','b']);state=updateNewCards(state,['a']);assert.deepEqual(state.fresh,[]);
 state=updateNewCards(state,['a','b']);assert.deepEqual(state.fresh,['b']);
});
test('returned replaces new, survives refresh and clears on hover, click or movement',()=>{
 let state=updateNewCards(updateNewCards(null,['a']),['a','b']);state=markReturnedCards(state,['b']);assert.deepEqual(state.fresh,[]);assert.deepEqual(state.returned,['b']);
 state=updateNewCards(JSON.parse(JSON.stringify(state)),['a','b']);assert.deepEqual(state.returned,['b']);state=acknowledgeCards(state,['b']);assert.deepEqual(state.returned,[]);
});
