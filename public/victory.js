import {hasVictory,cupWinners} from './win-conditions.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const cupMarkup='<svg class="leader-cup" viewBox="0 0 24 24" role="img" aria-label="Winner"><path d="M7 3h10v9l-3 3h-1v4h4v3H7v-3h4v-4h-1l-3-3V3zM7 5H3v5l4 3m10-8h4v5l-4 3" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
export function victoryMarkup(room){
 const mode=room.options.winMode,winners=cupWinners(room),names=room.state.names,scores=mode==='round'?room.state.scores:room.totals;
 const ordered=names.map((name,i)=>({name,i,score:scores[i]})).sort((a,b)=>Number(winners.includes(b.i))-Number(winners.includes(a.i))||a.score-b.score);
 const title=winners.map(i=>names[i]).join(' & ')+(winners.length>1?' share victory!':' wins!');
 const breakdown=mode==='multi'?`<div class="round-breakdown" tabindex="0" aria-label="Points by round"><table><thead><tr><th>Player</th>${room.roundResults.map((r,i)=>`<th>Round ${i+1}</th>`).join('')}<th>Total</th></tr></thead><tbody>${ordered.map(p=>`<tr><th>${esc(p.name)}</th>${room.roundResults.map(r=>`<td>${r.scores[p.i]}</td>`).join('')}<td><strong>${p.score}</strong></td></tr>`).join('')}</tbody></table></div>`:'';
 return `<p class="eyebrow">${mode==='multi'?'MATCH COMPLETE':'ROUND COMPLETE'}</p><h2 id="victory-title">${esc(title)}</h2><p class="victory-reason">${mode==='round'?'This round’s scores.':mode==='stacking'?'Current leaderboard · lowest total wins.':`A player reached ≥${room.options.winTarget}. Lowest total wins.`}</p><ol class="standings">${ordered.map(p=>`<li class="${winners.includes(p.i)?'winner':''}"><span class="standing-name">${winners.includes(p.i)?cupMarkup:''}<strong>${esc(p.name)}</strong>${winners.includes(p.i)?'<span class="winner-tag">WINNER</span>':''}</span><strong>${p.score}</strong></li>`).join('')}</ol>${breakdown}<p class="victory-meta">${room.roundResults?.length||room.completedGames} round${(room.roundResults?.length||room.completedGames)===1?'':'s'} played.</p><div class="victory-actions">${room.you===room.host?`<button data-victory-rematch class="primary">${mode==='multi'?'New match':'Another round'} →</button>`:'<span>Waiting for the host…</span>'}<button data-victory-close class="purple">View table</button></div>`;
}
let dialog,stamp=null,timer=null,current=null,rematch=null;
function getDialog(){if(!dialog){dialog=document.createElement('dialog');dialog.id='victory';dialog.setAttribute('aria-labelledby','victory-title');document.body.append(dialog);}return dialog;}
export function showVictory(){if(!hasVictory(current))return;const d=getDialog();d.innerHTML=victoryMarkup(current);d.querySelector('[data-victory-close]').onclick=()=>d.close();const button=d.querySelector('[data-victory-rematch]');if(button)button.onclick=()=>{button.disabled=true;rematch();};if(!d.open)d.showModal();}
export function syncVictory(room,onRematch){
 current=room;rematch=onRematch;
 if(!hasVictory(room)){clearTimeout(timer);timer=null;stamp=null;dialog?.close();return;}
 const key=room.code+':'+room.round;if(stamp===key)return;stamp=key;clearTimeout(timer);dialog?.close();timer=setTimeout(showVictory,1500);
}
