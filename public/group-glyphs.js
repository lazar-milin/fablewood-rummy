export function capsuleGlyphs(width,height,id){
 const w=width+6,h=height+6,r=Math.min(40,height/4,width/2),length=2*(width+height-4*r)+2*Math.PI*r,count=Math.max(12,Math.floor(length/4.5)),letters=Array.from({length:count},(_,i)=>'- x + I '[i%8]).join('');
 return `<svg class="sigil-border" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><defs><path id="${id}" d="M${r+3} 3H${w-r-3}Q${w-3} 3 ${w-3} ${r+3}V${h-r-3}Q${w-3} ${h-3} ${w-r-3} ${h-3}H${r+3}Q3 ${h-3} 3 ${h-r-3}V${r+3}Q3 3 ${r+3} 3Z"/></defs><text><textPath href="#${id}" textLength="${length}" lengthAdjust="spacing">${letters}</textPath></text></svg>`;
}
let observer;
export function fitGlyphBorders(){
 observer?.disconnect();observer=new ResizeObserver(entries=>{for(const {target}of entries){const w=target.offsetWidth,h=target.offsetHeight,key=w+':'+h;if(target.dataset.glyphSize===key)continue;target.dataset.glyphSize=key;const old=target.querySelector(':scope>.sigil-border');if(old)old.outerHTML=capsuleGlyphs(w,h,'sigil-unit-'+target.dataset.unit);}});
 document.querySelectorAll('.movement-game .pending-pack').forEach(e=>observer.observe(e));
}
