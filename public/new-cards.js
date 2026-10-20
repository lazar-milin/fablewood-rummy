// A deal is the baseline; later arrivals remain new until explicitly acknowledged.
export function updateNewCards(previous,ids){
 const present=new Set(ids);if(!previous)return {seen:[...ids],fresh:[],returned:[]};
 const seen=new Set(previous.seen),fresh=new Set(previous.fresh.filter(id=>present.has(id)));
 for(const id of ids)if(!seen.has(id))fresh.add(id);
 return {seen:[...ids],fresh:[...fresh],returned:(previous.returned||[]).filter(id=>present.has(id))};
}
export function acknowledgeCards(previous,ids){if(!previous)return previous;const touched=new Set(ids);return {...previous,fresh:previous.fresh.filter(id=>!touched.has(id)),returned:(previous.returned||[]).filter(id=>!touched.has(id))};}
export function markReturnedCards(previous,ids){const state=previous||{seen:[],fresh:[],returned:[]},returned=new Set([...(state.returned||[]),...ids]);return {...state,fresh:state.fresh.filter(id=>!returned.has(id)),returned:[...returned]};}
