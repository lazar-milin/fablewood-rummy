import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createGame,play} from '../public/engine.js';
import {huntEscapePathLengths} from '../public/hunt-escape.js';

const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
const css=await readFile(new URL('../public/hunt-escape.css',import.meta.url),'utf8');
const card=(rank,suit='hare',copy=0)=>({id:`${copy}-${suit}-${rank}`,rank,suit});
const run=(id,from,to,suit='hare',owner=0,extra={})=>({id,owner,kind:'run',suit,closed:false,cards:Array.from({length:to-from+1},(_,i)=>card(from+i,suit,9)),...extra});
function ready(role='escape'){
 const state=createGame(['A','B'],{variant:'hunt-escape'},()=>0.37);
 state.turn=0;state.turns=6;state.stage='meld';state.roles=[role,'hunt'];state.opened=[true,true];
 state.stock=Array.from({length:20},(_,i)=>card((i%9)+2,'owl',5));
 return state;
}

test('path lengths count only the current length of each unblocked path of four or more',()=>{
 const state=ready();state.melds=[run('three',1,3),run('four',2,5,'toad'),run('seven',4,10),run('stalked',1,6,'toad',0,{stalkedUntilTurn:99}),run('theirs',1,5,'hare',1)];
 assert.deepEqual(huntEscapePathLengths(state,0),[7,4]);
 state.melds[1].cards.push(card(6,'toad',9));
 assert.deepEqual(huntEscapePathLengths(state,0),[7,5],'extending 4→5 replaces the old length');
});

test('Escape wins at once when a path reaches exactly six cards',()=>{
 const state=ready();state.melds=[run('path',2,6)];state.hands[0]=[card(7),card(2,'toad'),card(3,'toad')];
 const next=play(state,0,{type:'layoff',index:0,ids:[card(7).id]});
 assert.equal(next.winner,0);
});

test('a seven-card path does not keep qualifying through its former six',()=>{
 const state=ready();state.melds=[run('path',2,7)];state.hands[0]=[card(8),card(2,'toad'),card(3,'toad')];
 const next=play(state,0,{type:'layoff',index:0,ids:[card(8).id]});
 assert.equal(next.winner,null);assert.deepEqual(huntEscapePathLengths(next,0),[7]);
});

test('five-and-four victories use exact current lengths and different suits',()=>{
 const wins=melds=>{const state=ready();state.melds=melds;state.hands[0]=[card(8,'toad',3),card(8,'owl',3),card(9,'owl',3)];return play(state,0,{type:'discard',ids:[card(8,'toad',3).id,card(8,'owl',3).id]}).winner===0;};
 assert.equal(wins([run('five',1,5),run('four',1,4,'toad')]),true);
 assert.equal(wins([run('five',1,5),run('four',7,10)]),false,'the four must be the other Prey suit');
 assert.equal(wins([run('seven',1,7),run('four',1,4,'toad')]),false,'a seven no longer counts as five');
 assert.equal(wins([run('five',1,5),run('five-b',1,5,'toad')]),false,'a five no longer counts as four');
 assert.equal(wins([run('six',1,6,'hare',0,{stalkedUntilTurn:99})]),false,'a Stalked six does not count');
});

test('becoming Escape with an existing six-card path wins with that cleanse',()=>{
 const state=ready('hunt');state.melds=[{id:'pack',owner:1,kind:'set',rank:9,closed:false,cards:[card(9,'fox',1),card(9,'owl',1)]},run('six',2,7)];
 state.hands[0]=[card(13,'fox',2),card(4,'owl',2),card(5,'toad',2)];
 const next=play(state,0,{type:'discard',ids:[card(13,'fox',2).id,card(4,'owl',2).id]});
 assert.equal(next.roles[0],'escape');assert.equal(next.winner,0);assert.equal(next.pendingEffect,null,'the win resolves before Evoke');
 const hunt=ready('hunt');hunt.melds=[run('six',2,7)];hunt.hands[0]=[card(2,'toad',2),card(4,'hare',2),card(5,'toad',2)];
 assert.equal(play(hunt,0,{type:'discard',ids:[card(2,'toad',2).id,card(4,'hare',2).id]}).winner,null,'other Spirits do not qualify');
});

test('player tiles show each path as a blue -X- marker',()=>{
 assert.match(app,/paths=huntEscapePathLengths\(s,player\)/);
 assert.match(app,/\$\{paths\.map\(length=>`<span class="sylvan-track-mark" aria-hidden="true">-\$\{length\}-<\/span>`\)\.join\(''\)\}/);
 assert.doesNotMatch(app,/sylvan-track-mark" aria-hidden="true">[↑→]/);
 assert.match(css,/\.player \.sylvan-track-mark\{color:#7db9ff;/);
});
