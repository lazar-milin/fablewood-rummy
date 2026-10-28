import {captureHand,animateHand,layoutRect,captureGroupCards,animateGroupCards} from './movement-animation.js';
// Pointer capture separates a click (selection) from a pull (movement).
export function installCardMovement({context,drop,allow=()=>true}){
 let held=null,ghost=null,over=null,suppressUntil=0,slot=null,handRoot=null,handMinHeight=null,previewKey=null,mergeHover=null;
 const clearMerge=()=>{if(!mergeHover)return;clearTimeout(mergeHover.timer);const root=mergeHover.unit.closest('[data-field-drafts]')||handRoot,before=captureHand(root),cards=captureGroupCards(mergeHover.unit);mergeHover.slot?.remove();animateHand(before,root);animateGroupCards(mergeHover.unit,cards);mergeHover=null;};
 const clear=()=>{const wasDragging=!!held?.active;clearMerge();const before=captureHand(handRoot);held?.element.classList.remove('being-held');slot?.remove();slot=null;if(handRoot)handRoot.style.minHeight=handMinHeight;animateHand(before,handRoot);handRoot=null;previewKey=null;ghost?.remove();ghost=null;over?.classList.remove('drop-hover');over=null;document.body.classList.remove('moving-cards');held=null;if(wasDragging)document.dispatchEvent(new Event('card-movement-end'));};
 const preview=(target,x,y)=>{
  if(!handRoot||!slot)return;const field=target?.type?.startsWith('field-')||target?.type==='field',reorder=['reorder','field-reorder'].includes(target?.type),merge=['merge','field-merge'].includes(target?.type),root=field?target?.root||document.querySelector('[data-field-drafts]'):target?.root||handRoot,zoneKey=target?.lane?.dataset.sylvanLane||target?.root?.closest('[data-drop-hand]')?.className||'',key=reorder?(field?'field:':'hand:')+target.before+':'+zoneKey:merge?target.type+':'+target.index:target?.type||'outside';if(key===previewKey)return;previewKey=key;held.anchor=reorder?{x,y,target}:null;
  const sourceSide=held.ownerElement.dataset.sylvanSide||held.element.dataset.sylvanSide,insertRoot=field?(target?.lane?.querySelector('.hunt-lane-drafts')||(target?.type==='field'?document.querySelector(`.hunt-field-lane[data-sylvan-lane="${sourceSide==='prey'?'path':'party'}"] .hunt-lane-drafts`):null)||root):root;
  const before=captureHand(root),other=captureHand(field?handRoot:document.querySelectorAll('[data-field-drafts]')),otherRoot=field?handRoot:document.querySelectorAll('[data-field-drafts]');
  if(reorder&&insertRoot){slot.classList.remove('hunt-drop-preview');slot.dataset.before=String(target.before);slot.dataset.zone=field?'field':'hand';const selector=field?'[data-field-group]':'[data-unit]',next=[...insertRoot.querySelectorAll(selector)].find(u=>u!==held.element&&Number(field?u.dataset.fieldGroup:u.dataset.unit)>=target.before);insertRoot.insertBefore(slot,next||null);}else if(target?.type==='field'&&insertRoot){slot.classList.add('hunt-drop-preview');insertRoot.append(slot);}else if(!merge){slot.classList.remove('hunt-drop-preview');slot.remove();}
  animateHand(before,root);animateHand(other,otherRoot);
 };
 const hoverMerge=(target,x,y)=>{
  const unit=['merge','field-merge'].includes(target?.type)?target.element:null;
  if(!unit||unit===held?.element||unit.querySelectorAll('.hand-card-shell').length<2){clearMerge();return;}
  if(mergeHover?.unit===unit){if(!mergeHover.slot){mergeHover.x=x;mergeHover.y=y;}return;}clearMerge();
  mergeHover={unit,index:target.index,type:target.type,x,y,slot:null,timer:setTimeout(()=>{
   if(!held?.active||!mergeHover||!unit.isConnected)return;
   const hover=mergeHover,faces=[...unit.querySelectorAll('.hand-card-shell')],position=faces.findIndex(shell=>{const r=layoutRect(shell);return hover.x<r.left+r.width/2;}),at=position<0?faces.length:position;
   const root=unit.closest('[data-field-drafts]')||handRoot,before=captureHand(root),cards=captureGroupCards(unit),gap=document.createElement('span'),scale=held.rect.width/held.cssWidth||1;
   gap.className='group-insert-slot';gap.style.width=Math.max(30,held.rect.width/scale-7)+'px';gap.style.height=(faces[0].offsetHeight)+'px';gap.setAttribute('aria-hidden','true');
   unit.querySelector('.pack-cards').insertBefore(gap,faces[at]||null);slot?.remove();hover.slot=gap;hover.position=at;held.anchor=null;
   animateHand(before,root);animateGroupCards(unit,cards);
  },350)};
 };
 document.addEventListener('pointerdown',e=>{
  suppressUntil=0;
  if(e.button!==0||e.target.closest('[data-split],.pack-close'))return;
  const element=e.target.closest('[data-unit],[data-stage],[data-field-group]'),ctx=context();if(!element||!ctx||!ctx.passed||ctx.busy)return;
  if((element.hasAttribute('data-stage')||element.hasAttribute('data-field-group'))&&(!ctx.own||element.dataset.fieldOwner!==undefined&&Number(element.dataset.fieldOwner)!==ctx.player))return;
  const eject=e.target.closest('.eject-card'),single=eject?.closest('.hand-card-shell')?.querySelector('[data-card]')?.dataset.card,dragElement=single?eject.closest('.hand-card-shell'):element,rect=dragElement.getBoundingClientRect();held={element:dragElement,ownerElement:element,single,cssWidth:dragElement.offsetWidth,id:e.pointerId,x:e.clientX,y:e.clientY,dx:e.clientX-rect.left,dy:e.clientY-rect.top,rect,unit:element.dataset.unit===undefined?null:Number(element.dataset.unit),stage:element.dataset.stage===undefined?null:Number(element.dataset.stage),field:element.dataset.fieldGroup===undefined?null:Number(element.dataset.fieldGroup),context:ctx,active:false};

 });
 // A target the rules would reject is treated as no target: no highlight, no preview slot and no drop.
 const allowed=target=>!target||!held||allow({unit:held.unit,stage:held.stage,field:held.field,single:held.single},target);
 const locate=(x,y)=>{
  const element=document.elementFromPoint(x,y);if(!element)return null;
  const discard=element.closest('[data-drop-discard]');if(discard){const pileCard=element.closest('[data-hunt-discard]'),piles=[...discard.querySelectorAll('.hunt-pile')],nearest=pileCard?Number(pileCard.dataset.huntDiscard):piles.length?piles.reduce((best,pile,index)=>{const r=pile.getBoundingClientRect(),distance=Math.abs(x-(r.left+r.width/2));return distance<best.distance?{index,distance}:best;},{index:0,distance:Infinity}).index:0;return {type:'discard',element:discard,pileIndex:Number.isFinite(nearest)?nearest:0};}
  const container=element.closest('[data-drop-hand],[data-field-drafts]'),root=container?.hasAttribute('data-drop-hand')?container.querySelector('.hand-cards'):container;if(root){
   const field=root.hasAttribute('data-field-drafts'),lane=field?element.closest('[data-sylvan-lane]'):null,mergeType=field?'field-merge':'merge',reorderType=field?'field-reorder':'reorder';
   if(mergeHover?.slot?.isConnected&&(field?mergeHover.unit.closest('[data-field-drafts]')===root:mergeHover.unit.closest('[data-drop-hand]')?.querySelector('.hand-cards')===root)){const r=mergeHover.unit.getBoundingClientRect();if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return {type:mergeHover.type,index:mergeHover.index,position:mergeHover.position,element:mergeHover.unit,root,lane};}
   if(held?.anchor&&Math.hypot(x-held.anchor.x,y-held.anchor.y)<14&&held.anchor.target.type===reorderType)return held.anchor.target;
   if(slot?.isConnected&&(field?slot.closest('[data-field-drafts]')===root:slot.parentElement===root)){const r=slot.getBoundingClientRect();if(x>=r.left&&x<r.right&&y>=r.top&&y<r.bottom)return {type:reorderType,before:Number(slot.dataset.before),element:root,root,lane};}
   const selector=field?'[data-field-group]:not(.being-held)':'[data-unit]:not(.being-held)',units=[...(lane?lane.querySelectorAll(selector):root.querySelectorAll(selector))],unit=units.find(u=>{const r=layoutRect(u);return x>=r.left&&x<r.right&&y>=r.top&&y<r.bottom;});
   const index=u=>Number(field?u.dataset.fieldGroup:u.dataset.unit);
   if(unit){const r=layoutRect(unit),i=index(unit);if(x>r.left+10&&x<r.right-10)return {type:mergeType,index:i,ids:[...unit.querySelectorAll('[data-card]')].map(c=>c.dataset.card),element:unit,root,lane};return {type:reorderType,before:i+(x>=r.left+r.width/2?1:0),element:root,root,lane};}
   if(field&&lane){const side=held?.ownerElement.dataset.sylvanSide||held?.element.dataset.sylvanSide,expected=side==='prey'?'path':'party';if(lane.dataset.sylvanLane!==expected){const destination=document.querySelector(`.hunt-field-lane[data-sylvan-lane="${expected}"]`);return {type:reorderType,before:Infinity,element:root,root,lane:destination||lane};}}
   const next=units.find(u=>{const r=layoutRect(u);return y<r.top||y<=r.bottom&&x<r.left+r.width/2;});if(field&&lane&&!next)return {type:reorderType,before:Infinity,element:root,root,lane};return {type:reorderType,before:next?index(next):Infinity,element:root,root,lane};}
  const meld=element.closest('[data-table-meld]');if(meld){const index=Number(meld.dataset.tableMeld),joker=[...meld.querySelectorAll('.card.joker')].find(c=>{const r=c.getBoundingClientRect();return x>=r.left&&x<r.right&&y>=r.top&&y<r.bottom;});return {type:joker?'replace':'layoff',index,jokerId:joker?.dataset.card,element:meld};}
  const field=element.closest('[data-drop-field]');if(field)return {type:'field',element:field};return null;
 };
 document.addEventListener('pointermove',e=>{
  if(!held||held.id!==e.pointerId)return;
  if(!held.active&&Math.hypot(e.clientX-held.x,e.clientY-held.y)<7)return;
  if(!held.active&&held.single){const r=held.ownerElement.getBoundingClientRect();if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom)return;}
  if(!held.active){const before=captureHand();document.getElementById('app').setPointerCapture(e.pointerId);held.active=true;document.dispatchEvent(new Event('card-movement-start'));document.body.classList.add('moving-cards');ghost=document.createElement('div');ghost.className='drag-ghost hand';ghost.style.width=held.rect.width+'px';ghost.innerHTML=(held.single?'<div class="hand-unit loose-unit">'+held.element.outerHTML+'</div>':held.element.outerHTML).replace(/(id|href)="(#?)(sigil-[^"]+|curve-joker-[^"]+)"/g,(_,a,hash,id)=>a+'="'+hash+id+'-held"');const faces=[...held.element.querySelectorAll('.card')],first=faces[0]?.getBoundingClientRect(),second=faces[1]?.getBoundingClientRect();if(first){ghost.style.setProperty('--held-card-width',first.width+'px');ghost.style.setProperty('--held-card-height',first.height+'px');if(second)ghost.style.setProperty('--held-overlap',(second.left-first.right)+'px');}document.body.append(ghost);handRoot=held.ownerElement.closest('[data-drop-hand]')?.querySelector('.hand-cards')||document.querySelector('.movement-game .hand-cards');if(handRoot){handMinHeight=handRoot.style.minHeight;const scale=handRoot.getBoundingClientRect().width/handRoot.offsetWidth||1;handRoot.style.setProperty('min-height',(handRoot.getBoundingClientRect().height/scale)+'px','important');slot=document.createElement('div');slot.className='drop-slot';slot.style.width=held.element.offsetWidth+'px';slot.style.height=held.element.offsetHeight+'px';slot.dataset.before=String(held.unit??Infinity);if(held.unit!==null&&!held.single){held.element.before(slot);previewKey='slot:'+held.unit;}}
  held.element.classList.add('being-held');animateHand(before,handRoot);}
  e.preventDefault();ghost.style.transform=`translate(${e.clientX-held.dx}px,${e.clientY-held.dy}px)`;
  const found=locate(e.clientX,e.clientY),target=allowed(found)?found:null;ghost.classList.toggle('drop-blocked',!!found&&!target);over?.classList.remove('drop-hover');over=['merge','field-merge','layoff','replace','discard'].includes(target?.type)?target.element:null;if(over!==held.element)over?.classList.add('drop-hover');preview(target,e.clientX,e.clientY);hoverMerge(target,e.clientX,e.clientY);
  const hand=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-drop-hand]')?.querySelector('.hand-cards')||handRoot;if(hand){const r=hand.getBoundingClientRect();if(e.clientY>=r.top&&e.clientY<=r.bottom){if(e.clientX<r.left+30)hand.scrollLeft-=16;else if(e.clientX>r.right-30)hand.scrollLeft+=16;}}
  if(e.clientY>innerHeight-45)window.scrollBy(0,14);else if(e.clientY<45)window.scrollBy(0,-14);
 },{passive:false});
 document.addEventListener('pointerup',e=>{
  if(!held||held.id!==e.pointerId)return;
  if(!held.active){clear();return;}
  e.preventDefault();suppressUntil=Date.now()+500;
  const source={unit:held.unit,stage:held.stage,field:held.field,single:held.single,context:held.context,dropRects:Object.fromEntries([...ghost.querySelectorAll('[data-card]')].map(card=>[card.dataset.card,card.getBoundingClientRect()]))},target=locate(e.clientX,e.clientY),original=held.element,pendingGhost=target?.type==='discard'?ghost:null;
  if(!allowed(target)){clear();return;}
  if(source.single&&target?.element===held.ownerElement){clear();return;}
  if(pendingGhost){ghost=null;pendingGhost.classList.add('awaiting-drop');}
  clear();original.classList.add('just-dropped');if(pendingGhost)original.classList.add('awaiting-discard');
  const cleanup=()=>{pendingGhost?.remove();original.classList.remove('awaiting-discard');};
  if(target||source.field!==null)Promise.resolve(drop(source,target||{type:'return'})).finally(cleanup);else cleanup();setTimeout(()=>original.classList.remove('just-dropped'),250);
 },true);
 document.addEventListener('click',e=>{if(Date.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
 document.addEventListener('pointercancel',clear);window.addEventListener('blur',clear);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&held){suppressUntil=Date.now()+500;clear();}});
}
