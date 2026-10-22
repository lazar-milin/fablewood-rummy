import test from 'node:test';
import assert from 'node:assert/strict';
import {createSoundPlayer,turnFinished} from '../public/sound-effects.js';

function fixture(){
 const notes=[];
 const context={currentTime:10,state:'running',destination:{},createOscillator(){const node={type:'',frequency:{setValueAtTime(value){node.hz=value;}},connect(){},start(at){node.at=at;},stop(at){node.stopAt=at;},};notes.push(node);return node;},createGain(){const node={gain:{events:[],setValueAtTime(value,at){this.events.push({value,at});},exponentialRampToValueAtTime(value,at){this.events.push({value,at});}},connect(){}};notes.at(-1).gain=node.gain;return node;},resume(){this.state='running';return Promise.resolve();}};
 let muted=false,volume=1,created=0;
 const play=createSoundPlayer({contextFactory:()=>{created++;return context;},isMuted:()=>muted,getVolume:()=>volume});
 return {play,notes,context,set muted(value){muted=value;},set volume(value){volume=value;},get created(){return created;}};
}

test('turn completion has a distinct three-note cue',()=>{
 const f=fixture();f.play('turn');
 assert.deepEqual(f.notes.map(note=>note.hz),[523.25,659.25,783.99]);
 assert.ok(f.notes[1].at>f.notes[0].at&&f.notes[2].at>f.notes[1].at);
});

test('turn cue is triggered only when the completed-turn count advances',()=>{
 assert.equal(turnFinished(null,{turns:1}),false);
 assert.equal(turnFinished({turns:1},{turns:1,turn:1}),false);
 assert.equal(turnFinished({turns:1},{turns:2,turn:1}),true);
 assert.equal(turnFinished({turns:4},{turns:0}),false);
});

test('mute blocks playback, while lower volume scales every sound to one tenth',()=>{
 const f=fixture();f.muted=true;f.play('turn');assert.equal(f.created,0);
 f.muted=false;f.volume=.1;f.play('draw');
 assert.equal(f.notes.length,2);
 const peaks=f.notes.map(note=>note.gain.events.find(event=>event.value>.0002).value);
 assert.ok(Math.abs(peaks[0]-.025)<1e-9&&Math.abs(peaks[1]-.028)<1e-9);
});
