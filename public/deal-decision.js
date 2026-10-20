const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let dialog,notice;
export function syncDealDecision(room,passed,decide){
 const decision=room?.dealDecision;
 if(!notice){notice=document.createElement('div');notice.id='deal-notice';notice.setAttribute('role','status');document.body.append(notice);}
 const canChoose=decision?.canDecide&&(room.mode!=='hotseat'||passed);
 notice.hidden=!decision||canChoose;notice.textContent=decision&&!canChoose?room.state.names[decision.player]+' is deciding whether to re-deal duplicate cards.':'';
 if(!canChoose){dialog?.close();return;}
 if(!dialog){dialog=document.createElement('dialog');dialog.id='deal-decision';dialog.setAttribute('aria-labelledby','deal-decision-title');dialog.addEventListener('cancel',e=>e.preventDefault());document.body.append(dialog);}
 dialog.innerHTML=`<h2 id="deal-decision-title">Keep this hand?</h2><p>${esc(room.state.names[decision.player])}, you have ${decision.pairs} pairs of identical cards.</p><p>No one can play until this choice is made. Re-dealing replaces everyone’s starting cards.</p><div class="deal-decision-actions"><button data-deal-keep class="purple">Keep hand</button><button data-deal-again class="rose">Re-deal cards</button></div>`;
 for(const [selector,redeal]of [['[data-deal-keep]',false],['[data-deal-again]',true]])dialog.querySelector(selector).onclick=()=>{dialog.querySelectorAll('button').forEach(b=>b.disabled=true);decide(redeal);};
 if(!dialog.open)dialog.showModal();
}
