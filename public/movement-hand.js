import {resolveMeld,SUITS} from './engine.js';
// The layout is local: each entry is one movable card or an arbitrary group.
export function reconcileLayout(layout,hand){
 const available=new Set(hand.map(c=>c.id)),seen=new Set(),out=[];
 for(const unit of Array.isArray(layout)?layout:[]){if(!Array.isArray(unit))continue;const ids=unit.filter(id=>available.has(id)&&!seen.has(id)&&(seen.add(id),true));if(ids.length)out.push(ids);}
 for(const card of hand)if(!seen.has(card.id))out.push([card.id]);return out;
}
export function selectUnit(layout,selected,index){
 const unit=layout[index];if(!unit)return {layout,selected};
 if(unit.every(id=>selected.includes(id)))return {layout,selected:[]};
 const ids=new Set([...selected,...unit]),chosen=layout.flat().filter(id=>ids.has(id));
 if(chosen.length<2)return {layout,selected:chosen};
 const first=layout.findIndex(u=>u.some(id=>ids.has(id))),out=[];
 layout.forEach((u,i)=>{if(i===first)out.push(chosen);const rest=u.filter(id=>!ids.has(id));if(rest.length)out.push(rest);});return {layout:out,selected:chosen};
}
export function moveUnit(layout,index,before){const out=layout.map(u=>[...u]),[unit]=out.splice(index,1);if(!unit)return layout;out.splice(Math.max(0,Math.min(out.length,before-(index<before?1:0))),0,unit);return out;}
export function mergeUnits(layout,source,target,position=null){if(source===target||!layout[source]||!layout[target])return layout;const targetIds=[...layout[target]],at=position===null?targetIds.length:Math.max(0,Math.min(targetIds.length,position));targetIds.splice(at,0,...layout[source]);return layout.filter((_,i)=>i!==source).map((u,i)=>i===(target-(source<target?1:0))?targetIds:[...u]);}
export function ungroupUnit(layout,index){return layout.flatMap((u,i)=>i===index?u.map(id=>[id]):[[...u]]);}
export function sortLayout(layout,hand,by,rules={}){
 const map=new Map(hand.map(c=>[c.id,c])),describe=ids=>{const cards=ids.map(id=>map.get(id)),meld=resolveMeld(cards,{rules}),real=cards.filter(c=>!c.joker);return {ids,kind:meld?.kind,animal:real.length?Math.min(...real.map(c=>SUITS.indexOf(c.suit))):4,value:real.length?Math.min(...real.map(c=>c.rank)):14};};
 return layout.map(describe).sort((a,b)=>{
  const left=by==='animal'?'set':'run',priority=Number(b.kind===left)-Number(a.kind===left);if(priority)return priority;
  return by==='animal'?a.animal-b.animal||a.value-b.value:a.value-b.value||a.animal-b.animal;
 }).map(u=>[...u.ids]);
}
