import test from 'node:test';
import assert from 'node:assert/strict';
import {previewCardAt} from '../public/card-preview-target.js';

const card=(left,top,width=80,height=160)=>({getBoundingClientRect:()=>({left,top,right:left+width,bottom:top+height,width,height})});
const surface=cards=>({closest:()=>null,querySelectorAll:()=>cards});

test('interactive cards are found from their art and keyboard focus without coordinates',()=>{
 const face=card(0,0);assert.equal(previewCardAt({closest:()=>face}),face);
});
test('moving across passive cards in one container finds the visible card and ends hover in gaps',()=>{
 const first=card(0,0),second=card(70,0),container=surface([first,second]);
 assert.equal(previewCardAt(container,20,50),first);
 assert.equal(previewCardAt(container,90,50),second);
 assert.equal(previewCardAt(container,75,50),second,'the later overlapping card is on top');
 assert.equal(previewCardAt(container,155,50),null,'moving off the card ends its hover');
});
test('hidden cards and cards behind an unrelated surface are not inspected',()=>{
 assert.equal(previewCardAt(surface([card(0,0,0,0)]),0,0),null);
 assert.equal(previewCardAt(surface([]),20,50),null);
 assert.equal(previewCardAt(null,20,50),null);
});
