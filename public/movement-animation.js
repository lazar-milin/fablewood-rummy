// FLIP keeps wrapped rows moving from their visible positions into new slots.
export function captureHand(root=document.querySelector('.movement-game .hand-cards')){
 const out=new Map();if(!root)return out;
 for(const unit of root.querySelectorAll('[data-unit]:not(.being-held):not(.just-dropped)')){
  const ids=[...unit.querySelectorAll('[data-card]')].map(c=>c.dataset.card).sort().join('|');
  if(ids)out.set(ids,unit.getBoundingClientRect());
 }return out;
}
export function animateHand(before,root=document.querySelector('.movement-game .hand-cards')){
 if(!root||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 for(const unit of root.querySelectorAll('[data-unit]:not(.being-held)')){
  const key=[...unit.querySelectorAll('[data-card]')].map(c=>c.dataset.card).sort().join('|'),old=before.get(key);if(!old)continue;
  unit.getAnimations().forEach(a=>a.cancel());const now=unit.getBoundingClientRect(),scale=now.width/unit.offsetWidth||1,dx=(old.left-now.left)/scale,dy=(old.top-now.top)/scale;
  if(Math.abs(dx)+Math.abs(dy)<1)continue;
  unit.animate([{translate:`${dx}px ${dy}px`},{translate:'0px 0px'}],{duration:420,easing:'cubic-bezier(.2,.8,.2,1)'});
 }
}
export function layoutRect(unit){
 const r=unit.getBoundingClientRect(),t=getComputedStyle(unit).translate.split(' '),scale=r.width/unit.offsetWidth||1,dx=(parseFloat(t[0])||0)*scale,dy=(parseFloat(t[1])||0)*scale;
 return {left:r.left-dx,right:r.right-dx,top:r.top-dy,bottom:r.bottom-dy,width:r.width,height:r.height};
}
export function captureGroupCards(unit){return new Map([...unit.querySelectorAll('.hand-card-shell')].map(shell=>[shell.querySelector('[data-card]').dataset.card,shell.getBoundingClientRect()]));}
export function animateGroupCards(unit,before){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 for(const shell of unit.querySelectorAll('.hand-card-shell')){const old=before.get(shell.querySelector('[data-card]').dataset.card);if(!old)continue;shell.getAnimations().forEach(a=>a.cancel());const now=shell.getBoundingClientRect(),scale=now.width/shell.offsetWidth||1,dx=(old.left-now.left)/scale,dy=(old.top-now.top)/scale;if(Math.abs(dx)+Math.abs(dy)>1)shell.animate([{translate:`${dx}px ${dy}px`},{translate:'0px 0px'}],{duration:420,easing:'ease-out'});}
}
