import {resolveMeld,meldChoices,DEFAULT_RULES} from './engine.js';
export function possibleGroup(cards,rules={}){
 if(cards.length<2)return false;const opts={...DEFAULT_RULES,...rules},real=cards.filter(c=>!c.joker),jokers=cards.length-real.length;
 if(!real.length||(opts.openingMeld!==false&&jokers>1)||new Set(cards.map(c=>c.id)).size!==cards.length)return false;
 if(cards.length<=4&&real.every(c=>c.rank===real[0].rank)&&new Set(real.map(c=>c.suit)).size===real.length)return true;
 if(new Set(real.map(c=>c.suit)).size!==1)return false;
 return [false,true].some(high=>{if(high&&opts.aceMode==='low'||!high&&opts.aceMode==='high'&&real.some(c=>c.rank===1))return false;const ns=real.map(c=>c.rank===1&&high?14:c.rank);return new Set(ns).size===ns.length&&Math.max(...ns)-Math.min(...ns)+1<=cards.length+1;});
}
export function tidyGroups(groups,hand,rules={}){const map=new Map(hand.map(c=>[c.id,c])),used=new Set(),result=[];for(const ids of groups){if(ids.every(id=>map.has(id)&&!used.has(id))&&resolveMeld(ids.map(id=>map.get(id)),{opening:rules.openingMeld!==false,rules})){ids.forEach(id=>used.add(id));result.push([...ids]);}}return result;}
export function chooseCard(hand,groups,selected,id,rules={}){
 const map=new Map(hand.map(c=>[c.id,c]));groups=tidyGroups(groups,hand,rules);if(!map.has(id))return {groups,selected};
 if(selected.includes(id))return {groups,selected:selected.filter(x=>x!==id)};
 const inGroup=groups.find(ids=>ids.includes(id));
 if(inGroup){const result=finishDraft(hand,groups,selected,rules);return {groups:result.groups,selected:[...new Set([...result.selected,...inGroup])]};}
 const next=[...selected,id],cards=next.map(id=>map.get(id)),complete=resolveMeld(cards,{opening:rules.openingMeld!==false,rules});
 if(complete){const touched=groups.filter(ids=>ids.some(id=>selected.includes(id))),untouched=groups.filter(ids=>!touched.includes(ids)),ids=complete.cards.map(c=>c.id);
  if(groupAdditions(hand,untouched,ids,rules).length)return {groups:untouched,selected:ids};
  return {groups:[...untouched,ids],selected:ids};
 }
 const pending=selected.filter(id=>!groups.flat().includes(id));
 if(resolveMeld(pending.map(id=>map.get(id)),{opening:rules.openingMeld!==false,rules})){
  const done=finishDraft(hand,groups,selected,rules);return {groups:done.groups,selected:[id]};
 }
 if(groups.some(ids=>ids.some(id=>selected.includes(id))))return {groups,selected:[id]};
 return {groups,selected:next};
}
export function groupAdditions(hand,groups,ids,rules={}){const grouped=new Set(groups.flat()),cs=ids.map(id=>hand.find(c=>c.id===id));return hand.filter(c=>!ids.includes(c.id)&&!grouped.has(c.id)&&resolveMeld([...cs,c],{opening:rules.openingMeld!==false,rules}));}
export function finishDraft(hand,groups,selected,rules={}){const used=new Set(groups.flat()),pending=selected.filter(id=>!used.has(id)),map=new Map(hand.map(c=>[c.id,c])),m=resolveMeld(pending.map(id=>map.get(id)),{opening:rules.openingMeld!==false,rules});return m?{groups:[...groups,m.cards.map(c=>c.id)],selected:[...new Set([...selected,...m.cards.map(c=>c.id)])]}:{groups,selected};}
export function selectedOpeningInfo(hand,groups,selected,rules={}){const ids=new Set(selected),chosen=groups.filter(g=>g.every(id=>ids.has(id))),packed=new Set(groups.flat()),pending=selected.filter(id=>!packed.has(id)),map=new Map(hand.map(c=>[c.id,c]));if(resolveMeld(pending.map(id=>map.get(id)),{opening:rules.openingMeld!==false,rules}))chosen.push(pending);const info=openingInfo(hand,chosen,rules);return {...info,canOpen:info.canOpen&&info.count===ids.size};}
export function sortLooseCards(hand,groups,selected,sort='suit',rules={}){const used=new Set(groups.flat()),pending=selected.map(id=>hand.find(c=>c.id===id)).filter(Boolean);if(possibleGroup(pending,rules)&&!pending.some(c=>used.has(c.id)))pending.forEach(c=>used.add(c.id));return hand.filter(c=>!used.has(c.id)).sort((a,b)=>sort==='rank'?a.rank-b.rank||a.suit.localeCompare(b.suit):['fox','hare','toad','owl','joker'].indexOf(a.suit)-['fox','hare','toad','owl','joker'].indexOf(b.suit)||a.rank-b.rank);}
export function openingInfo(hand,groups,rules={}){
 const opts={...DEFAULT_RULES,...rules},map=new Map(hand.map(c=>[c.id,c])),valid=tidyGroups(groups,hand,opts),melds=valid.map(ids=>resolveMeld(ids.map(id=>map.get(id)),{opening:rules.openingMeld!==false,rules:opts}));
 const points=valid.reduce((n,ids)=>n+Math.max(...meldChoices(ids.map(id=>map.get(id)),{opening:opts.openingMeld!==false,rules:opts}).map(m=>m.points)),0),count=valid.flat().length,handFinish=opts.handEnabled&&!opts.handRequiresOpening&&count===hand.length-1&&(opts.handJokers||!hand.some(c=>c.joker));
 return {groups:valid,melds,points,count,canOpen:count<hand.length&&valid.length>0&&(points>=opts.opening||handFinish)};
}
