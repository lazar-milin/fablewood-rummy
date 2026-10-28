// Only public faces and anonymous draws belong in the animation stream.
export function describeMove(before,after){
 const player=before.turn,out=[],locations=s=>new Map([...(s.melds||[]).flatMap((m,index)=>m.cards.map(card=>[card.id,{zone:'meld',index,card}])) ,...(s.fieldGroups||[]).flatMap((m,index)=>m.cards.map(card=>[card.id,{zone:'draft',index,card}])) ,...(s.openingAttempt||[]).flatMap((m,index)=>(m.cards||[]).map(card=>[card.id,{zone:'attempt',index,card}]))]);
 const old=locations(before),next=locations(after);
 for(const [id,location]of next)if(!old.has(id)||old.get(id).zone==='draft'&&location.zone!=='draft')out.push({player,from:old.has(id)?{zone:old.get(id).zone,index:old.get(id).index}:{zone:'player',index:player},to:{zone:location.zone,index:location.index},card:location.card});
 const discardPiles=s=>s.options?.variant==='hunt-escape'?s.discardPiles||[[],[]]:[s.discard||[]],beforePiles=discardPiles(before),afterPiles=discardPiles(after);
 if(before.options?.variant==='hunt-escape')for(let pile=0;pile<2;pile++){const oldIds=new Set((beforePiles[pile]||[]).map(c=>c.id));for(const card of afterPiles[pile]||[])if(!oldIds.has(card.id))out.push({player,from:{zone:'player',index:player},to:{zone:'hunt-discard',index:pile},card});}
 else{const discarded=new Set((beforePiles[0]||[]).map(c=>c.id));for(const card of afterPiles[0]||[])if(!discarded.has(card.id))out.push({player,from:{zone:'player',index:player},to:{zone:'discard'},card});}
 for(const [id,location]of old)if((location.card.joker||location.zone==='draft'||location.zone==='attempt')&&!next.has(id)&&after.hands[player].some(c=>c.id===id)&&!after.discard.some(c=>c.id===id))out.push({player,from:{zone:location.zone,index:location.index},to:{zone:'player',index:player},card:location.card});
 const draw=(before.options?.variant==='rummikub'?after.stock.length<before.stock.length:after.stage==='meld'&&before.stage==='draw')&&after.hands[player].length>before.hands[player].length;
 if(draw){const fromCut=before.cutCard&&!after.cutCard,oldHand=new Set(before.hands[player].map(c=>c.id)),newCards=after.hands[player].filter(c=>!oldHand.has(c.id)),pickedPile=before.options?.variant==='hunt-escape'?beforePiles.findIndex((pile,index)=>pile.at(-1)&&!afterPiles[index].some(c=>c.id===pile.at(-1).id)&&newCards.some(card=>card.id===pile.at(-1).id)):-1,classicTop=beforePiles[0]?.at(-1),fromDiscard=!!classicTop&&!afterPiles[0].some(c=>c.id===classicTop.id)&&after.hands[player].some(c=>c.id===classicTop.id);
  if(pickedPile>=0){const card=beforePiles[pickedPile].at(-1);out.push({player,from:{zone:'hunt-discard',index:pickedPile},to:{zone:'player',index:player},card});for(let i=1;i<newCards.length;i++)out.push({player,from:{zone:'stock'},to:{zone:'player',index:player},card:null,drawIndex:i});}
  else if(before.options?.variant==='hunt-escape'){for(let i=0;i<newCards.length;i++)out.push({player,from:{zone:'stock'},to:{zone:'player',index:player},card:null,drawIndex:i});}
  else out.push({player,from:{zone:fromCut?'cut':fromDiscard?'discard':'stock'},to:{zone:'player',index:player},card:fromCut?before.cutCard:fromDiscard?classicTop:null});}
 return out;
}
export function unseenMoves(previous,next){
 if(!previous?.state||previous.round!==next.round)return [];
 const last=previous.moves?.at(-1)?.id||0;
 return (next.moves||[]).filter(m=>m.id>last).flatMap(m=>{
  const local=next.seatTypes[m.player]!=='bot'&&(next.mode==='local'||m.player===next.you);
  if(!local)return [m];
  if(m.from?.zone==='draft'&&m.to.zone==='meld')return [m];
  if(['draft','meld'].includes(m.to.zone)&&m.from?.zone==='player')return [{...m,from:{zone:'hand',index:m.player}}];
  if(m.to.zone==='player'&&['draft','attempt'].includes(m.from?.zone))return [{...m,to:{zone:'hand',index:m.player}}];
  if(m.to.zone==='discard')return [{...m,from:{zone:'hand',index:m.player}}];
  if(m.to.zone==='hunt-discard')return [{...m,from:{zone:'hand',index:m.player}}];
  if(m.to.zone==='player'&&['stock','discard','hunt-discard','cut'].includes(m.from?.zone)){
   const oldIds=new Set(previous.state.hands[m.player].map(c=>c.id)),drawn=next.state.hands[m.player].filter(c=>c.id&&!oldIds.has(c.id)),card=m.card||drawn[m.drawIndex??0];
   return card?[{...m,to:{zone:'hand',index:m.player},card}]:[];
  }
  return [];
 });
}
