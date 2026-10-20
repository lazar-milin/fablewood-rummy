// Only public faces and anonymous draws belong in the animation stream.
export function describeMove(before,after){
 const player=before.turn,out=[],locations=s=>new Map([...(s.melds||[]).flatMap((m,index)=>m.cards.map(card=>[card.id,{zone:'meld',index,card}])) ,...(s.openingAttempt||[]).flatMap((m,index)=>(m.cards||[]).map(card=>[card.id,{zone:'attempt',index,card}]))]);
 const old=locations(before),next=locations(after);
 for(const [id,location]of next)if(!old.has(id))out.push({player,from:{zone:'player',index:player},to:{zone:location.zone,index:location.index},card:location.card});
 const discarded=new Set(before.discard.map(c=>c.id));for(const card of after.discard)if(!discarded.has(card.id))out.push({player,from:{zone:'player',index:player},to:{zone:'discard'},card});
 for(const [id,location]of old)if(location.card.joker&&!next.has(id)&&!after.discard.some(c=>c.id===id))out.push({player,from:{zone:location.zone,index:location.index},to:{zone:'player',index:player},card:location.card});
 const draw=after.stage==='meld'&&before.stage==='draw'&&after.hands[player].length>before.hands[player].length;
 if(draw){const fromCut=before.cutCard&&!after.cutCard,fromDiscard=!!before.discard.at(-1)&&!after.discard.some(c=>c.id===before.discard.at(-1).id)&&after.hands[player].some(c=>c.id===before.discard.at(-1).id);out.push({player,from:{zone:fromCut?'cut':fromDiscard?'discard':'stock'},to:{zone:'player',index:player},card:fromCut?before.cutCard:fromDiscard?before.discard.at(-1):null});}
 return out;
}
export function unseenMoves(previous,next){
 if(!previous?.state||previous.round!==next.round)return [];
 const last=previous.moves?.at(-1)?.id||0;
 return (next.moves||[]).filter(m=>m.id>last).flatMap(m=>{
  const local=next.seatTypes[m.player]!=='bot'&&(next.mode==='hotseat'||m.player===next.you);
  if(!local)return [m];
  if(m.to.zone==='discard')return [{...m,from:{zone:'hand',index:m.player}}];
  if(m.to.zone==='player'&&['stock','discard','cut'].includes(m.from.zone)){
   const oldIds=new Set(previous.state.hands[m.player].map(c=>c.id)),card=m.card||next.state.hands[m.player].find(c=>c.id&&!oldIds.has(c.id));
   return card?[{...m,to:{zone:'hand',index:m.player},card}]:[];
  }
  return [];
 });
}
