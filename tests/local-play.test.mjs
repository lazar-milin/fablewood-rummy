import {test} from 'vitest';
import assert from 'node:assert/strict';
import {sharedLocalHands,localPlayer,needsLocalPass} from '../public/local-play.js';
const room=(seatTypes,turn=0)=>({mode:'local',you:0,seatTypes,state:{turn,winner:null},dealDecision:null});
test('one human keeps their own hand through bot phases without a pass cover',()=>{
 for(const turn of [0,1,2,0]){const r=room(['human','bot','bot'],turn);assert.equal(sharedLocalHands(r),false);assert.equal(localPlayer(r),0);assert.equal(needsLocalPass(r),false);}
});
test('multiple local humans reveal their own turns and review hands privately',()=>{
 const r=room(['human','bot','human'],2);assert.equal(sharedLocalHands(r),true);assert.equal(localPlayer(r),2);assert.equal(needsLocalPass(r),true);
 r.state.turn=1;assert.equal(needsLocalPass(r),false);assert.equal(localPlayer(r),1);
 r.dealDecision={player:2};assert.equal(localPlayer(r),2);assert.equal(needsLocalPass(r),true);
 r.dealDecision=null;r.state.winner=2;assert.equal(needsLocalPass(r),false);
});
test('online hands remain on the connected player without a pass cover',()=>{
 const r={...room(['human','human'],1),mode:'online'};assert.equal(sharedLocalHands(r),false);assert.equal(localPlayer(r),0);assert.equal(needsLocalPass(r),false);
});
