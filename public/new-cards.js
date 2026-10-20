// A deal is the baseline; later arrivals remain new until explicitly acknowledged.
export function updateNewCards(previous,ids){
 const present=new Set(ids);if(!previous)return {seen:[...ids],fresh:[]};
 const seen=new Set(previous.seen),fresh=new Set(previous.fresh.filter(id=>present.has(id)));
 for(const id of ids)if(!seen.has(id))fresh.add(id);
 return {seen:[...ids],fresh:[...fresh]};
}
export function acknowledgeCards(previous,ids){if(!previous)return previous;const touched=new Set(ids);return {...previous,fresh:previous.fresh.filter(id=>!touched.has(id))};}
