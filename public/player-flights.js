import {cardMarkup,cardBackMarkup} from './card-art.js';
const active=new Set(),hidden=new Map(),dragOrigins=new Map();let underlay=null,underlayFace='',underlayMarkup=null,context,refreshFrame=0;
function nodeFor(place,card){
 if(place.zone==='hand')return document.querySelector(`.hand [data-card="${card?.id}"]`);
 if(place.zone==='player')return document.querySelector(`[data-player="${place.index}"]`);
 if(place.zone==='stock')return document.getElementById('draw-stock');
 if(place.zone==='cut')return document.getElementById('draw-cut');
 if(place.zone==='discard')return document.querySelector('#discard-pile>.card')||document.querySelector('[data-drop-discard] .empty-card');
 const parent=document.querySelector(place.zone==='meld'?`[data-table-meld="${place.index}"]`:`[data-stage="${place.index}"]`);return parent?.querySelector(`[data-card="${card?.id}"]`)||parent;
}
export function rememberDragDiscards(rects={}){const entries=Object.entries(rects);for(const [id,rect]of entries)dragOrigins.set(id,rect);return ()=>{for(const [id,rect]of entries)if(dragOrigins.get(id)===rect)dragOrigins.delete(id);};}
export function prepareFlights(moves){return moves.map(move=>{const drag=move.from.zone==='hand'&&move.to.zone==='discard'?dragOrigins.get(move.card?.id):null;return {...move,start:drag||nodeFor(move.from,move.card)?.getBoundingClientRect(),dragged:!!drag,previousDiscard:move.to.zone==='discard'?nodeFor({zone:'discard'})?.querySelector('.forest-card')?.outerHTML:null};});}
function finish(record){
 if(!active.delete(record))return;record.ghost.remove();
 if(record.move.to.zone==='discard'&&record.move.card)underlayFace=cardMarkup(record.move.card);
 refreshFlights();
}
function animateTo(record,end){
 const {move,ghost}=record,toPlayer=move.to.zone==='player',width=toPlayer?80:end.width,height=toPlayer?160:end.height,x=toPlayer?end.left+end.width/2-width/2:end.left,y=toPlayer?end.top+end.height/2-height/2:end.top;
 const key=[x,y,width,height].join(':');if(record.endKey===key)return;
 const box=record.started?ghost.getBoundingClientRect():record.start,initial=!record.started,fromPlayer=initial&&move.from.zone==='player',fromCut=initial&&move.from.zone==='cut';
 const fromX=(initial?Math.max(0,Math.min(innerWidth,box.left+box.width/2)):box.left+box.width/2)-width/2,fromY=(initial?Math.max(0,Math.min(innerHeight,box.top+box.height/2)):box.top+box.height/2)-height/2;
 const sx=fromPlayer?.9:(fromCut?box.height:box.width)/width,sy=fromPlayer?.9:(fromCut?box.width:box.height)/height;
 record.animation?.cancel();ghost.style.left=x+'px';ghost.style.top=y+'px';ghost.style.width=width+'px';ghost.style.height=height+'px';
 const animation=ghost.animate([{transform:`translate(${fromX-x}px,${fromY-y}px) rotate(${fromCut?90:0}deg) scale(${sx},${sy})`,opacity:1},{transform:'translate(0,0) rotate(0deg) scale(1)',opacity:1}],{duration:initial?record.duration:Math.max(80,record.deadline-performance.now()),delay:initial?record.delay:0,easing:'cubic-bezier(.2,.75,.2,1)',fill:'both'});
 record.animation=animation;record.started=true;record.endKey=key;animation.finished.then(()=>{if(record.animation===animation)finish(record);},()=>{});
}
// Rebind hidden faces after a render and keep flights aligned while scrolling or resizing.
export function refreshFlights(nextContext){
 if(nextContext!==undefined&&context!==nextContext){for(const record of active){record.animation?.cancel();record.ghost.remove();}active.clear();context=nextContext;}
 const targets=new Set();
 for(const record of active){if(record.started&&performance.now()>=record.deadline){finish(record);continue;}const target=nodeFor(record.move.to,record.move.card),end=target?.getBoundingClientRect();if(!end?.width)continue;if(record.move.to.zone!=='player')targets.add(target);animateTo(record,end);}
 for(const [target,visibility]of hidden)if(!targets.has(target)){if(target.isConnected)target.style.visibility=visibility;hidden.delete(target);}
 for(const target of targets){if(!hidden.has(target))hidden.set(target,target.style.visibility);target.style.visibility='hidden';}
 const discard=[...active].find(record=>record.move.to.zone==='discard'),pile=discard&&nodeFor(discard.move.to,discard.move.card),rect=pile?.getBoundingClientRect();
 document.querySelector('[data-drop-discard]')?.toggleAttribute?.('data-incoming',!!discard);
 if(rect?.width){
  if(!underlay){underlay=document.createElement('div');underlay.setAttribute('aria-hidden','true');document.body.append(underlay);}
  underlay.className=underlayFace?'card discard-flight-underlay':'empty-card discard-flight-underlay';const art=underlayFace.replace(/curve-joker-[a-z0-9-]+/g,id=>id+'-underlay');if(underlayMarkup!==art){underlay.innerHTML=art;underlayMarkup=art;}
  underlay.style.left=rect.left+'px';underlay.style.top=rect.top+'px';underlay.style.width=rect.width+'px';underlay.style.height=rect.height+'px';
 }else{underlay?.remove();underlay=null;underlayFace='';underlayMarkup=null;}
}
export function flyCards(moves){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const now=performance.now();
 for(const [i,move]of moves.entries()){
  const target=nodeFor(move.to,move.card),end=target?.getBoundingClientRect();if(!target||!move.start||!end?.width)continue;
  if(move.to.zone==='discard'&&![...active].some(r=>r.move.to.zone==='discard'))underlayFace=move.previousDiscard||'';
  const ghost=document.createElement('div');ghost.className='card player-card-flight';ghost.setAttribute('aria-hidden','true');ghost.innerHTML=(move.card?cardMarkup(move.card):cardBackMarkup).replace(/curve-joker-[a-z0-9-]+/g,id=>id+'-flight-'+move.id);document.body.append(ghost);
  const delay=Math.min(i,8)*85,duration=move.dragged?350:1250;active.add({move,start:move.start,ghost,delay,duration,deadline:now+delay+duration,started:false});
 }
 refreshFlights();
}
if(typeof window!=='undefined')for(const event of ['scroll','resize'])window.addEventListener(event,()=>{if(active.size&&!refreshFrame)refreshFrame=requestAnimationFrame(()=>{refreshFrame=0;refreshFlights();});},{passive:true,capture:true});
