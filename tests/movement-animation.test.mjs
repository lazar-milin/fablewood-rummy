import test from 'node:test';import assert from 'node:assert/strict';
import {captureHand,animateHand,layoutRect} from '../public/movement-animation.js';
const unit=(id,left,width=80)=>{const flags=new Set();return {flags,classList:{add:name=>flags.add(name),remove:name=>flags.delete(name)},offsetWidth:80,translation:'none',rect:{left,top:100,right:left+width,bottom:260,width,height:160},calls:[],cancelled:0,querySelector:()=>null,querySelectorAll:()=>[{dataset:{card:id}}],getBoundingClientRect(){return this.rect;},getAnimations(){return [{cancel:()=>this.cancelled++}];},animate(frames,options){this.calls.push({frames,options});return {finished:new Promise(resolve=>{this.complete=resolve;})};}};};

test('reordering across wrapped rows animates from the old visible position at the current zoom',()=>{
 globalThis.matchMedia=()=>({matches:false});
 const a=unit('a',0,40),b=unit('b',100,40),root={querySelectorAll:()=>[a,b]},before=captureHand(root);
 a.rect={...a.rect,left:100,right:140,top:200,bottom:360};b.rect={...b.rect,left:0,right:40};animateHand(before,root);
 assert.equal(a.calls[0].frames[0].translate,'-200px -200px');assert.equal(b.calls[0].frames[0].translate,'200px 0px');assert.equal(a.calls[0].frames[1].translate,'0px 0px');assert.equal(a.cancelled,1);assert.ok(a.calls[0].options.duration>=400);
});
test('drop geometry ignores animation offsets so shifting cards do not move the target',()=>{
 const a=unit('a',106,40);a.rect={...a.rect,top:196,bottom:276};a.translation='12px -8px';globalThis.getComputedStyle=e=>({translate:e.translation});
 const r=layoutRect(a);assert.equal(r.left,100);assert.equal(r.top,200);assert.equal(r.right,140);assert.equal(r.bottom,280);
});
test('reduced-motion preference skips movement animation',()=>{
 globalThis.matchMedia=()=>({matches:true});const a=unit('a',0),root={querySelectorAll:()=>[a]},before=captureHand(root);a.rect.left=100;animateHand(before,root);assert.equal(a.calls.length,0);assert.equal(a.cancelled,0);
});

test('packing keeps remove controls gated until its animation completes',async()=>{globalThis.matchMedia=()=>({matches:false});const a=unit('a',0),root={querySelectorAll:()=>[a]},before=captureHand(root);a.rect={...a.rect,left:100,right:180};animateHand(before,root);assert.ok(a.flags.has('unit-moving'));a.complete();await Promise.resolve();await Promise.resolve();await Promise.resolve();assert.equal(a.flags.has('unit-moving'),false);});
test('field drafts animate across every container in a list',()=>{globalThis.matchMedia=()=>({matches:false});const a=unit('a',0),b=unit('b',200),roots=[{querySelectorAll:()=>[a]},{querySelectorAll:()=>[b]}],before=captureHand(roots);a.rect={...a.rect,left:100,right:180};b.rect={...b.rect,left:300,right:380};animateHand(before,roots);assert.equal(a.calls[0].frames[0].translate,'-100px 0px');assert.equal(b.calls[0].frames[0].translate,'-100px 0px');});
