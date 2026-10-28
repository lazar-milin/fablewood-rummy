// Sylvan Trail publishes one announcement per finished turn in the shared state, so
// every client shows the same names and effects exactly once.
const NEXT_EFFECTS=['Quenched','Hurried'],SELF_EFFECTS=['Evoked','Arisen','Blazed'];

export function newTurnAnnouncement(before,after){
 const event=after?.turnAnnouncement;if(!before||!event||after.winner!==null&&after.winner!==undefined)return null;
 // A new round starts a fresh state whose sequence restarts at one.
 const previous=Number(after.turns)<Number(before.turns)?0:Number(before.turnAnnouncement?.sequence)||0;
 return Number(event.sequence)>previous?event:null;
}

export function turnAnnouncementMarkup(event,names,esc){
 const row=(effects,allowed)=>`<div class="turn-announcement-row">${(effects||[]).filter(effect=>allowed.includes(effect)).map(effect=>`<span class="turn-announcement-effect effect-${effect.toLowerCase()}">${effect}</span>`).join('')}</div>`;
 const section=(name,verb,effects,allowed)=>(effects||[]).some(effect=>allowed.includes(effect))?`<div class="turn-announcement-section"><div class="turn-announcement-name">${esc(name||'')} ${verb}:</div>${row(effects,allowed)}</div>`:'';
 return section(names?.[event.next],'is',event.nextEffects,NEXT_EFFECTS)+section(names?.[event.player],'has',event.selfEffects,SELF_EFFECTS);
}
