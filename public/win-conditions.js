export const DEFAULT_WIN_RULES={winEnabled:false,winMode:'none',winTarget:301};
export const multiRound=options=>options?.winEnabled&&options.winMode==='multi';
const lowest=totals=>{const value=Math.min(...totals);return totals.flatMap((n,i)=>n===value?[i]:[]);};
export function awardRound(room,now=Date.now()){
 if(room.state.winner===null||room.scored)return false;
 room.totals=room.totals.map((n,i)=>n+room.state.scores[i]);room.scored=true;room.completedGames++;
 room.roundResults=[...(room.roundResults||[]),{round:room.round,winner:room.state.winner,scores:[...room.state.scores]}];
 room.matchWinners=multiRound(room.options)&&room.totals.some(n=>n>=room.options.winTarget)?lowest(room.totals):[];
 room.nextRoundAt=multiRound(room.options)&&!room.matchWinners.length?now+5000:null;
 return true;
}
export function cupWinners(room){
 if(!room?.options.winEnabled||!room.completedGames)return [];
 if(room.options.winMode==='round'){const last=room.roundResults?.at(-1);return last?[last.winner]:[];}
 if(room.options.winMode==='stacking')return lowest(room.totals);
 return room.options.winMode==='multi'?room.matchWinners||[]:[];
}
export function hasVictory(room){return room?.state?.winner!=null&&room.options.winEnabled&&(room.options.winMode==='round'||room.options.winMode==='stacking'||room.options.winMode==='multi'&&!!room.matchWinners?.length);}
export function resetMatch(room){room.totals=room.totals.map(()=>0);room.roundResults=[];room.matchWinners=[];room.nextRoundAt=null;}
