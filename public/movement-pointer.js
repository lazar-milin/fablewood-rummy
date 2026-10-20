import {captureHand,animateHand,layoutRect,captureGroupCards,animateGroupCards} from './movement-animation.js';
// Pointer capture separates a click (selection) from a pull (movement).
export function installCardMovement({context,drop}){
 let held=null,ghost=null,over=null,suppressUntil=0,slot=null,handRoot=null,handMinHeight=null,previewKey=null,mergeHover=null;
 const clearMerge=()=>{if(!mergeHover)return;clearTimeout(mergeHover.timer);const before=captureHand(handRoot),cards=captureGroupCards(mergeHover.unit);mergeHover.slot?.remove();animateHand(before,handRoot);animateGroupCards(mergeHover.unit,cards);mergeHover=null;};
 const clear=()=>{const wasDragging=!!held?.active;clearMerge();const before=captureHand(handRoot);held?.element.classList.remove('being-held');slot?.remove();slot=null;if(handRoot)handRoot.style.minHeight=handMinHeight;animateHand(before,handRoot);handRoot=null;previewKey=null;ghost?.remove();ghost=null;over?.classList.remove('drop-hover');over=null;document.body.classList.remove('moving-cards');held=null;if(wasDragging)document.dispatchEvent(new Event('card-movement-end'));};
 const preview=(target,x,y)=>{
  if(!handRoot||!slot)return;const key=target?.type==='reorder'?'slot:'+target.before:target?.type||'outside';if(key===previewKey)return;previewKey=key;held.anchor=target?.type==='reorder'?{x,y,target}:null;
  const before=captureHand(handRoot);
  if(target?.type==='reorder'){
   slot.dataset.before=String(target.before);const next=[...handRoot.querySelectorAll('[data-unit]')].find(u=>u!==held.element&&Number(u.dataset.unit)>=target.before);
   handRoot.insertBefore(slot,next||null);
  }else if(target?.type==='merge'){
   // Retain the current gap while crossing cards to merge; collapsing it would
   // move every following target under the pointer.
   if(!slot.isConnected&&held.unit!==null){const next=[...handRoot.querySelectorAll('[data-unit]')].find(u=>u!==held.element&&Number(u.dataset.unit)>=held.unit);slot.dataset.before=String(held.unit);handRoot.insertBefore(slot,next||null);}
  }else slot.remove();
  animateHand(before,handRoot);
 };
 const hoverMerge=(target,x,y)=>{
  const unit=target?.type==='merge'?target.element:null;
  if(!unit||unit===held?.element||unit.querySelectorAll('.hand-card-shell').length<2){clearMerge();return;}
  if(mergeHover?.unit===unit){if(!mergeHover.slot){mergeHover.x=x;mergeHover.y=y;}return;}clearMerge();
  mergeHover={unit,index:target.index,x,y,slot:null,timer:setTimeout(()=>{
   if(!held?.active||!mergeHover||!unit.isConnected)return;
   const hover=mergeHover,faces=[...unit.querySelectorAll('.hand-card-shell')],position=faces.findIndex(shell=>{const r=layoutRect(shell);return hover.x<r.left+r.width/2;}),at=position<0?faces.length:position;
   const before=captureHand(handRoot),cards=captureGroupCards(unit),gap=document.createElement('span'),scale=held.rect.width/held.cssWidth||1;
   gap.className='group-insert-slot';gap.style.width=Math.max(30,held.rect.width/scale-7)+'px';gap.style.height=(faces[0].offsetHeight)+'px';gap.setAttribute('aria-hidden','true');
   unit.querySelector('.pack-cards').insertBefore(gap,faces[at]||null);slot?.remove();hover.slot=gap;hover.position=at;held.anchor=null;
   animateHand(before,handRoot);animateGroupCards(unit,cards);
  },350)};
 };
 document.addEventListener('pointerdown',e=>{
  suppressUntil=0;
  if(e.button!==0||e.target.closest('[data-split],.pack-close,.eject-card'))return;
  const element=e.target.closest('[data-unit],[data-stage]'),ctx=context();if(!element||!ctx||!ctx.passed||ctx.busy)return;
  if(element.hasAttribute('data-stage')&&!ctx.own)return;
  const rect=element.getBoundingClientRect();held={element,cssWidth:element.offsetWidth,id:e.pointerId,x:e.clientX,y:e.clientY,dx:e.clientX-rect.left,dy:e.clientY-rect.top,rect,unit:element.dataset.unit===undefined?null:Number(element.dataset.unit),stage:element.dataset.stage===undefined?null:Number(element.dataset.stage),context:ctx,active:false};

 });
 const locate=(x,y)=>{
  const element=document.elementFromPoint(x,y);if(!element)return null;
  const discard=element.closest('[data-drop-discard]');if(discard)return {type:'discard',element:discard};
  const hand=element.closest('[data-drop-hand]');if(hand){
   if(mergeHover?.slot?.isConnected){const r=mergeHover.unit.getBoundingClientRect();if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return {type:'merge',index:mergeHover.index,position:mergeHover.position,element:mergeHover.unit};}
   // Keep the chosen slot stable while wrapping rows move beneath a resting pointer.
   if(held?.anchor&&Math.hypot(x-held.anchor.x,y-held.anchor.y)<14)return held.anchor.target;
   if(slot?.isConnected){const r=slot.getBoundingClientRect();if(x>=r.left&&x<r.right&&y>=r.top&&y<r.bottom)return {type:'reorder',before:Number(slot.dataset.before),element:hand};}
   const units=[...hand.querySelectorAll('[data-unit]:not(.being-held)')],unit=units.find(u=>{const r=layoutRect(u);return x>=r.left&&x<r.right&&y>=r.top&&y<r.bottom;});
   if(unit){const r=layoutRect(unit),i=Number(unit.dataset.unit);if(x>r.left+10&&x<r.right-10)return {type:'merge',index:i,element:unit};return {type:'reorder',before:i+(x>=r.left+r.width/2?1:0),element:unit};}
   const next=units.find(u=>{const r=layoutRect(u);return y<r.top||y<=r.bottom&&x<r.left+r.width/2;});return {type:'reorder',before:next?Number(next.dataset.unit):Infinity,element:hand};}
  const meld=element.closest('[data-table-meld]');if(meld){const index=Number(meld.dataset.tableMeld),joker=[...meld.querySelectorAll('.card.joker')].find(c=>{const r=c.getBoundingClientRect();return x>=r.left&&x<r.right&&y>=r.top&&y<r.bottom;});return {type:joker?'replace':'layoff',index,jokerId:joker?.dataset.card,element:meld};}
  const field=element.closest('[data-drop-field]');if(field)return {type:'field',element:field};return null;
 };
 document.addEventListener('pointermove',e=>{
  if(!held||held.id!==e.pointerId)return;
  if(!held.active&&Math.hypot(e.clientX-held.x,e.clientY-held.y)<7)return;
  if(!held.active){const before=captureHand();document.getElementById('app').setPointerCapture(e.pointerId);held.active=true;document.dispatchEvent(new Event('card-movement-start'));document.body.classList.add('moving-cards');ghost=document.createElement('div');ghost.className='drag-ghost hand';ghost.style.width=held.rect.width+'px';ghost.innerHTML=held.element.outerHTML.replace(/(id|href)="(#?)(sigil-[^"]+|curve-joker-[^"]+)"/g,(_,a,hash,id)=>a+'="'+hash+id+'-held"');const faces=[...held.element.querySelectorAll('.card')],first=faces[0]?.getBoundingClientRect(),second=faces[1]?.getBoundingClientRect();if(first){ghost.style.setProperty('--held-card-width',first.width+'px');ghost.style.setProperty('--held-card-height',first.height+'px');if(second)ghost.style.setProperty('--held-overlap',(second.left-first.right)+'px');}document.body.append(ghost);handRoot=document.querySelector('.movement-game .hand-cards');if(handRoot){handMinHeight=handRoot.style.minHeight;const scale=handRoot.getBoundingClientRect().width/handRoot.offsetWidth||1;handRoot.style.setProperty('min-height',(handRoot.getBoundingClientRect().height/scale)+'px','important');slot=document.createElement('div');slot.className='drop-slot';slot.style.width=held.element.offsetWidth+'px';slot.style.height=held.element.offsetHeight+'px';slot.dataset.before=String(held.unit??Infinity);if(held.unit!==null){held.element.before(slot);previewKey='slot:'+held.unit;}}
  held.element.classList.add('being-held');animateHand(before,handRoot);}
  e.preventDefault();ghost.style.transform=`translate(${e.clientX-held.dx}px,${e.clientY-held.dy}px)`;
  const target=locate(e.clientX,e.clientY);over?.classList.remove('drop-hover');over=target?.element;if(over!==held.element)over?.classList.add('drop-hover');preview(target,e.clientX,e.clientY);hoverMerge(target,e.clientX,e.clientY);
  const hand=document.querySelector('.hand-cards');if(hand){const r=hand.getBoundingClientRect();if(e.clientY>=r.top&&e.clientY<=r.bottom){if(e.clientX<r.left+30)hand.scrollLeft-=16;else if(e.clientX>r.right-30)hand.scrollLeft+=16;}}
  if(e.clientY>innerHeight-45)window.scrollBy(0,14);else if(e.clientY<45)window.scrollBy(0,-14);
 },{passive:false});
 document.addEventListener('pointerup',e=>{
  if(!held||held.id!==e.pointerId)return;
  if(!held.active){clear();return;}
  e.preventDefault();suppressUntil=Date.now()+500;
  const source={unit:held.unit,stage:held.stage,context:held.context,dropRects:Object.fromEntries([...ghost.querySelectorAll('[data-card]')].map(card=>[card.dataset.card,card.getBoundingClientRect()]))},target=locate(e.clientX,e.clientY),original=held.element,pendingGhost=target?.type==='discard'?ghost:null;
  if(pendingGhost){ghost=null;pendingGhost.classList.add('awaiting-drop');}
  clear();original.classList.add('just-dropped');if(pendingGhost)original.classList.add('awaiting-discard');
  const cleanup=()=>{pendingGhost?.remove();original.classList.remove('awaiting-discard');};
  if(target)Promise.resolve(drop(source,target)).finally(cleanup);else cleanup();setTimeout(()=>original.classList.remove('just-dropped'),250);
 },true);
 document.addEventListener('click',e=>{if(Date.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
 document.addEventListener('pointercancel',clear);window.addEventListener('blur',clear);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&held){suppressUntil=Date.now()+500;clear();}});
}
