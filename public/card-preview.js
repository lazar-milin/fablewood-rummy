import {previewCardAt as cardAt} from './card-preview-target.js';
const DELAY=4000,HOLD=500;
let source=null,timer=null,preview=null,hold=null,swallowClick=false;
function hide(){clearTimeout(timer);timer=null;source=null;preview?.remove();preview=null;}
function show(card){
 if(!card.isConnected)return hide();
 const art=card.querySelector('.forest-card,.rk-face');if(!art)return;
 const label=card.id==='draw-stock'?(art.classList.contains('simple-back')?'The Crescent Moon':'The Crescent Grimoire'):(art.getAttribute('aria-label')||card.getAttribute('aria-label')||'Card').replace(/^JOKER:\s*/,'');
 preview=document.createElement('div');preview.id='card-magnifier';preview.setAttribute('role','tooltip');preview.setAttribute('aria-label',label);
 const body=document.createElement('div');body.className='magnifier-content';
 const face=document.createElement('div');face.className='card magnifier-card';if(art.classList.contains('rk-face')){face.style.setProperty('--paper',card.style.getPropertyValue('--paper'));face.style.setProperty('--ink',card.style.getPropertyValue('--ink'));}face.innerHTML=art.outerHTML.replace(/curve-joker-[a-z0-9-]+/g,id=>id+'-magnifier');
 const title=document.createElement('h2');title.textContent=label;
 body.append(face,title);preview.append(body);document.body.append(preview);
}
function open(card){hide();source=card;show(card);}
function cancelHold(){if(hold){clearTimeout(hold.timer);hold=null;}}
// Mouse: rest on a card for four seconds.
document.addEventListener('card-movement-start',()=>{hide();cancelHold();});
function trackMouse(event){
 if(document.body.classList.contains('moving-cards'))return;
 if(event.pointerType!=='mouse')return;
 const card=cardAt(event.target,event.clientX,event.clientY);if(card===source)return;
 hide();if(!card)return;source=card;timer=setTimeout(()=>show(card),DELAY);
}
document.addEventListener('pointerover',trackMouse);
document.addEventListener('pointermove',trackMouse);
document.addEventListener('pointerout',event=>{
 if(event.pointerType==='mouse'&&!event.relatedTarget)return hide();
 if(event.pointerType==='mouse'&&source&&source.contains(event.target)&&!source.contains(event.relatedTarget))hide();
});
// Touch and pen: hold a card for half a second. Moving the finger cancels, and the tap that ends the hold doesn't select the card.
document.addEventListener('pointerdown',event=>{
 hide();cancelHold();swallowClick=false;
 if(event.target.closest('[data-unit],[data-stage],[data-field-group]'))return;
 const card=event.pointerType==='mouse'?null:cardAt(event.target,event.clientX,event.clientY);if(!card)return;
 hold={id:event.pointerId,x:event.clientX,y:event.clientY,timer:setTimeout(()=>{hold=null;swallowClick=true;open(card);},HOLD)};
},true);
document.addEventListener('pointermove',event=>{if(hold&&event.pointerId===hold.id&&Math.hypot(event.clientX-hold.x,event.clientY-hold.y)>10)cancelHold();},true);
document.addEventListener('pointerup',cancelHold,true);
document.addEventListener('pointercancel',cancelHold,true);
document.addEventListener('click',event=>{if(swallowClick){swallowClick=false;event.preventDefault();event.stopPropagation();}},true);
document.addEventListener('contextmenu',event=>{if(event.pointerType!=='mouse'&&cardAt(event.target,event.clientX,event.clientY))event.preventDefault();});
// Keyboard: V shows the focused card large and hides it again; Escape or moving focus hides it.
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'){const wasOpen=!!preview;hide();if(wasOpen){event.preventDefault();event.stopPropagation();}return;}
 if(event.key.toLowerCase()!=='v'||event.ctrlKey||event.metaKey||event.altKey)return;
 const card=cardAt(document.activeElement);if(!card)return;
 event.preventDefault();if(preview&&source===card)hide();else open(card);
});
document.addEventListener('focusin',event=>{if(preview&&source&&!source.contains(event.target))hide();});
window.addEventListener('scroll',hide,true);
window.addEventListener('blur',hide);
