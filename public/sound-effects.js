const cues={
 action:[{hz:660,at:0,duration:.12,level:.3}],
 turn:[{hz:523.25,at:0,duration:.2,level:.34},{hz:659.25,at:.11,duration:.22,level:.34},{hz:783.99,at:.22,duration:.34,level:.36}],
 draw:[{hz:440,at:0,duration:.1,level:.25},{hz:587.33,at:.07,duration:.14,level:.28}]
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
