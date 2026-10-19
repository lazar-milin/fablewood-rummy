const DELAY=4000;
let source=null,timer=null,preview=null;
const cardAt=target=>target instanceof Element?target.closest('.card[data-card],#draw-stock'):null;
function hide(){clearTimeout(timer);timer=null;source=null;preview?.remove();preview=null;}
function show(card){
 if(!card.isConnected)return hide();
 const art=card.querySelector('.forest-card');if(!art)return;
 const label=card.id==='draw-stock'?'The Crescent Grimoire':(art.getAttribute('aria-label')||card.getAttribute('aria-label')||'Card').replace(/^JOKER:\s*/,'');
 preview=document.createElement('div');preview.id='card-magnifier';preview.setAttribute('role','tooltip');preview.setAttribute('aria-label',label);
 const body=document.createElement('div');body.className='magnifier-content';
 const face=document.createElement('div');face.className='card magnifier-card';face.innerHTML=art.outerHTML.replace(/curve-joker-[a-z0-9-]+/g,id=>id+'-magnifier');
 const title=document.createElement('h2');title.textContent=label;
 body.append(face,title);preview.append(body);document.body.append(preview);
}
document.addEventListener('pointerover',event=>{
 const card=cardAt(event.target);if(card===source)return;
 hide();if(!card)return;source=card;timer=setTimeout(()=>show(card),DELAY);
});
document.addEventListener('pointerout',event=>{
 if(source&&source.contains(event.target)&&!source.contains(event.relatedTarget))hide();
});
document.addEventListener('pointerdown',hide,true);
document.addEventListener('keydown',event=>{if(event.key==='Escape')hide();});
window.addEventListener('scroll',hide,true);
window.addEventListener('blur',hide);
