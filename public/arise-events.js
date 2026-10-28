export function newlyArisenCards(before,after){
 if(!before||!after)return [];
 const event=after.ariseEvent,previousSequence=Number(before.ariseEvent?.sequence)||0;
 if(event&&Number(event.sequence)>previousSequence)return event.cards||[];
 const player=before.turn,previous=new Map((before.hands?.[player]||[]).map(card=>[card.id,Number(card.effectGlowUntil)||0]));
 return (after.hands?.[player]||[]).filter(card=>card.effectGlow==='arise'&&(Number(card.effectGlowUntil)||0)>(previous.get(card.id)||0));
}
