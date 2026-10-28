import test from 'node:test';import assert from 'node:assert/strict';import {prepareFlights,flyCards,flyArise,refreshFlights,rememberDragDiscards} from '../public/player-flights.js';
import {setSimpleCards} from '../public/card-art.js?v=hivis-official-3';
function fixture(){
 let groupEnabled=false;const flags=new Set(),unit={classList:{add:value=>flags.add(value),remove:value=>flags.delete(value)}};
 const saved={document:globalThis.document,matchMedia:globalThis.matchMedia,innerWidth:globalThis.innerWidth,innerHeight:globalThis.innerHeight},nodes=[],animations=[];
 let target={closest:()=>groupEnabled?unit:null,style:{visibility:''},isConnected:true,toggleAttribute(name,value){if(name==='data-incoming')this.incoming=value;},getBoundingClientRect:()=>({left:100,top:200,width:80,height:160}),querySelector:()=>({outerHTML:'<span class="forest-card">previous top</span>'})};
 globalThis.matchMedia=()=>({matches:false});globalThis.innerWidth=1200;globalThis.innerHeight=900;
 globalThis.document={querySelector:()=>target,querySelectorAll:()=>flags.has('flight-arriving')?[unit]:[],createElement:()=>{const node={style:{},innerHTML:'',setAttribute(){},getBoundingClientRect(){return {left:parseFloat(this.style.left)||0,top:parseFloat(this.style.top)||0,width:80,height:160};},animate(frames,options){let resolve,reject;const finished=new Promise((a,b)=>{resolve=a;reject=b;});const animation={frames,options,finished,resolve,cancel:()=>reject(Error('cancelled'))};animations.push(animation);return animation;},remove(){this.removed=true;}};nodes.push(node);return node;},body:{append(){}}};
 return {nodes,animations,flags,enableGroup(){groupEnabled=true;},get target(){return target;},replaceTarget(){target.isConnected=false;target={...target,style:{visibility:''},isConnected:true};},restore(){refreshFlights(null);for(const [k,v]of Object.entries(saved)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}}};
}
const move=(id=1)=>({id,from:{zone:'player',index:1},to:{zone:'discard'},card:{id:'a'+id,rank:2,suit:'fox'}}),settle=async()=>{await Promise.resolve();await Promise.resolve();};
test('flight ghosts share the live HI-VIS simple-card renderer',()=>{const f=fixture();try{setSimpleCards(true);flyCards(prepareFlights([move()]));assert.match(f.nodes[0].innerHTML,/simple-card/);assert.match(f.nodes[0].innerHTML,/heads\/hivis\/fox-head-hivis\.svg/);}finally{setSimpleCards(false);f.restore();}});
test('card flights stay opaque, full sized and visible for more than a second',async()=>{
 const f=fixture();try{flyCards(prepareFlights([move()]));const a=f.animations[0];assert.ok(a.options.duration>=1200);assert.ok(a.frames.every(frame=>frame.opacity===1));assert.doesNotMatch(a.frames[0].transform,/scale\(0\.[0-5]/);assert.equal(f.target.style.visibility,'hidden');assert.equal(f.target.incoming,true);const underlay=f.nodes.find(n=>n.className.includes('discard-flight-underlay'));assert.match(underlay.innerHTML,/previous top/);a.resolve();await settle();assert.equal(f.target.style.visibility,'');assert.equal(f.target.incoming,false);assert.equal(underlay.removed,true);}finally{f.restore();}
});
test('overlapping discards retain only one previous face and always reveal their destination',async()=>{
 const f=fixture();try{flyCards(prepareFlights([move(1),move(2)]));assert.equal(f.nodes.filter(n=>n.className.includes('discard-flight-underlay')).length,1);f.animations[0].resolve();await settle();assert.equal(f.target.style.visibility,'hidden');f.animations[1].resolve();await settle();assert.equal(f.target.style.visibility,'');assert.ok(f.nodes.every(n=>n.removed));}finally{f.restore();}
});
test('a render rebinds hidden targets and closing a table cleans up active flights',async()=>{
 const f=fixture();try{flyCards(prepareFlights([move()]));f.replaceTarget();refreshFlights();assert.equal(f.target.style.visibility,'hidden');refreshFlights('another-table');assert.equal(f.target.style.visibility,'');assert.ok(f.nodes.every(n=>n.removed));await settle();}finally{f.restore();}
});

test('a manually discarded card settles from its release position instead of flying back from the hand',async()=>{const f=fixture(),rect={left:120,top:190,width:80,height:160},forget=rememberDragDiscards({a1:rect});try{const event={...move(),from:{zone:'hand',index:0}},prepared=prepareFlights([event]);assert.equal(prepared[0].start,rect);assert.equal(prepared[0].dragged,true);flyCards(prepared);assert.equal(f.animations[0].options.duration,350);f.animations[0].resolve();await settle();forget();assert.equal(prepareFlights([event])[0].dragged,false);}finally{forget();f.restore();}});

test('group controls stay hidden until the final incoming card flight settles',async()=>{const f=fixture();try{f.enableGroup();const events=[move(1),move(2)].map(m=>({...m,to:{zone:'hand',index:0}}));flyCards(prepareFlights(events));assert.ok(f.flags.has('flight-arriving'));f.animations[0].resolve();await settle();assert.ok(f.flags.has('flight-arriving'));f.animations[1].resolve();await settle();assert.equal(f.flags.has('flight-arriving'),false);}finally{f.restore();}});

test('Arise flies from the hand to the pile, pauses, then visibly returns to the hand',async()=>{
 const saved={document:globalThis.document,matchMedia:globalThis.matchMedia,CSS:globalThis.CSS,setTimeout:globalThis.setTimeout},animations=[],hand={style:{visibility:''},isConnected:true,getBoundingClientRect:()=>({left:20,top:120,width:80,height:160})},pile={getBoundingClientRect:()=>({left:320,top:200,width:80,height:160})},player={getBoundingClientRect:()=>({left:800,top:10,width:90,height:48})};
 globalThis.matchMedia=()=>({matches:false});globalThis.CSS={escape:value=>value};globalThis.setTimeout=callback=>{callback();return 0;};globalThis.document={querySelector:selector=>selector.includes('.hand [data-card=')?hand:selector.includes('[data-hunt-discard=')?pile:selector.includes('[data-player=')?player:null,createElement:()=>{const node={style:{},animate(frames,options){let resolve;const finished=new Promise(done=>resolve=done);animations.push({frames,options,resolve});return {finished};},setAttribute(){},remove(){this.removed=true;}};return node;},body:{append(){}}};
 try{
  flyArise([{card:{id:'ace',rank:1,suit:'hare'},player:0,pile:0,sourceRect:hand.getBoundingClientRect()}]);
  assert.equal(hand.style.visibility,'hidden');assert.equal(animations.length,1);
  animations[0].resolve();await Promise.resolve();await Promise.resolve();await Promise.resolve();
  assert.equal(animations.length,2);assert.equal(animations[1].frames[0].transform,animations[0].frames[1].transform);assert.match(animations[1].frames[1].transform,/translate\(-300px,-80px\)/);
  animations[1].resolve();await Promise.resolve();await Promise.resolve();assert.equal(hand.style.visibility,'');
 }finally{for(const [key,value]of Object.entries(saved)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});
