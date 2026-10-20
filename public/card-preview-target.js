const selector='.card[data-card],#draw-stock';

// Passive cards have pointer-events:none so that they cannot trigger a move.
// Their nearest interactive ancestor receives the pointer event instead.
export function previewCardAt(target,x,y){
 if(typeof target?.closest!=='function')return null;
 const direct=target.closest(selector);if(direct)return direct;
 if(!Number.isFinite(x)||!Number.isFinite(y))return target.matches?.('[data-unit]')?target.querySelector(selector):null;
 const cards=[...target.querySelectorAll(selector)].reverse();
 return cards.find(card=>{
  const rect=card.getBoundingClientRect();
  return rect.width>0&&rect.height>0&&x>=rect.left&&x<rect.right&&y>=rect.top&&y<rect.bottom;
 })||null;
}
