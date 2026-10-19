import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {cardMarkup,cardBackMarkup} from '../public/card-art.js';
import {SUITS} from '../public/engine.js';

test('all 108 game cards and the back resolve to imported artwork with local assets',()=>{
 const cards=[0,1].flatMap(d=>SUITS.flatMap(suit=>Array.from({length:13},(_,i)=>({id:`${d}-${suit}-${i+1}`,suit,rank:i+1}))));
 cards.push(...Array.from({length:4},(_,i)=>({id:`joker-${i}`,joker:true})));
 for(const html of [...cards.map(cardMarkup),cardBackMarkup]){
  assert.ok(html.includes('forest-card'));
  for(const [,url]of html.matchAll(/src="([^"]+)"/g))assert.ok(existsSync(new URL('../public'+url,import.meta.url)),url);
 }
 assert.equal(new Set(cards.filter(c=>c.joker).map(cardMarkup)).size,4);
});
test('imported ranks use H B Q E, and joker curve IDs remain unique per game card',()=>{
 for(const [rank,label]of [[10,'H'],[11,'B'],[12,'Q'],[13,'E']])assert.ok(cardMarkup({id:`0-fox-${rank}`,suit:'fox',rank}).includes(`class="art-rank">${label}</span>`));
 const a=cardMarkup({id:'joker-0',joker:true}),b=cardMarkup({id:'joker-4',joker:true});
 assert.ok(a.includes('curve-joker-dragon-joker-0'));
 assert.ok(b.includes('curve-joker-dragon-joker-4'));
 assert.ok(cardBackMarkup.includes('back-grimoire'));
});
test('card markup holds only phrasing content, so it is valid inside the card button',()=>{
 const cards=[0,1].flatMap(d=>SUITS.flatMap(suit=>Array.from({length:13},(_,i)=>({id:`${d}-${suit}-${i+1}`,suit,rank:i+1}))));
 cards.push(...Array.from({length:4},(_,i)=>({id:`joker-${i}`,joker:true})));
 for(const html of [...cards.map(cardMarkup),cardBackMarkup])assert.doesNotMatch(html,/<(div|p|section|h[1-6]|ul|ol)[\s>]/);
});
