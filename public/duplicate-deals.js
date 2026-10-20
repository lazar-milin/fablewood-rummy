// Two physical copies of the same animal/rank form one duplicate pair.
export function duplicatePairs(hand){const counts=new Map();for(const card of hand){if(card.joker||card.hidden)continue;const key=card.suit+':'+card.rank;counts.set(key,(counts.get(key)||0)+1);}return [...counts.values()].reduce((n,count)=>n+Math.floor(count/2),0);}
export function dealReview(state,players,limit){return {pending:limit?Array.from({length:players.length},(_,n)=>(state.first+n)%players.length).filter(i=>players[i].type==='human'&&duplicatePairs(state.hands[i])>=limit):[]};}
