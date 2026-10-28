const cues={
 action:[{hz:660,at:0,duration:.12,level:.3}],
 turn:[{hz:523.25,at:0,duration:.2,level:.34},{hz:659.25,at:.11,duration:.22,level:.34},{hz:783.99,at:.22,duration:.34,level:.36}],
 draw:[{hz:440,at:0,duration:.1,level:.25},{hz:587.33,at:.07,duration:.14,level:.28}],
 blaze:[{hz:784,at:0,duration:.14,level:.34},{hz:988,at:.1,duration:.18,level:.38},{hz:587.33,at:.3,duration:.24,level:.34}],
 quench:[{hz:698.46,at:0,duration:.15,level:.32},{hz:523.25,at:.12,duration:.17,level:.34},{hz:392,at:.25,duration:.26,level:.32}],
 hurry:[{hz:880,at:0,duration:.09,level:.34},{hz:1174.66,at:.09,duration:.13,level:.38}],
 evoke:[{hz:392,at:0,duration:.2,level:.34},{hz:293.66,at:.13,duration:.28,level:.38},{hz:220,at:.32,duration:.35,level:.34}],
 arise:[{hz:440,at:0,duration:.13,level:.32},{hz:659.25,at:.1,duration:.16,level:.36},{hz:880,at:.23,duration:.25,level:.38}]
};

export function turnFinished(before,after){
 return Number.isFinite(before?.turns)&&Number.isFinite(after?.turns)&&after.turns>before.turns;
}

export function createSoundPlayer({contextFactory,isMuted=()=>false,getVolume=()=>1}){
 let context=null;
 const getContext=()=>context||(context=contextFactory());
 function unlock(){
  if(isMuted())return;
  try{const ctx=getContext();if(ctx?.state==='suspended')void ctx.resume();}catch{}
 }
 function play(name='action'){
  if(isMuted())return;
  try{
   const ctx=getContext();if(!ctx)return;
   if(ctx.state==='suspended')void ctx.resume();
   const now=ctx.currentTime,volume=Math.max(0,Math.min(1,Number(getVolume())||0));
   for(const note of cues[name]||cues.action){
    const start=now+note.at,oscillator=ctx.createOscillator(),gain=ctx.createGain();
    oscillator.type='triangle';oscillator.frequency.setValueAtTime(note.hz,start);
    oscillator.connect(gain);gain.connect(ctx.destination);
    gain.gain.setValueAtTime(.0001,start);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002,note.level*volume),start+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,start+note.duration);
    oscillator.start(start);oscillator.stop(start+note.duration+.015);
   }
  }catch{}
 }
 play.unlock=unlock;
 return play;
}
