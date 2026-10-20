// Drafts reserve hand IDs rather than duplicating physical cards. Only play()
// transfers ownership into a permanent meld, using the usual rule validation.
export function fieldAction(s,player,action,{play,resolveMeld,PlayerError},random){
 const hand=s.hands[player],rules=s.options||{};
 const fail=message=>{throw new PlayerError(message);};
 const group=index=>{const g=s.fieldGroups?.[index];if(!Number.isInteger(index)||!g||g.owner!==player)fail('Choose one of your unfinished field groups.');return g;};
 const cards=ids=>{if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)fail('Choose each card once.');const cs=ids.map(id=>hand.find(c=>c.id===id));if(cs.some(c=>!c))fail('Choose cards from your hand.');return cs;};
 const available=ids=>{cards(ids);const used=new Set((s.fieldGroups||[]).flatMap(g=>g.ids));if(ids.some(id=>used.has(id)))fail('That card is already on the field.');};
 const release=index=>{const g=group(index);s.fieldGroups.splice(index,1);return g.ids;};
 s.fieldGroups||=[];
 if(action.type==='field-return'){
  if(action.index===undefined)s.fieldGroups=[];else release(action.index);return s;
 }
 if(action.type==='field-eject'){
  const g=group(action.index);if(!g.ids.includes(action.id))fail('Choose a card in this group.');g.ids=g.ids.filter(id=>id!==action.id);if(!g.ids.length)s.fieldGroups.splice(action.index,1);return settle();
 }
 if(action.type==='field-reorder'){
  const g=group(action.index);s.fieldGroups.splice(action.index,1);const before=Number.isInteger(action.before)?action.before:s.fieldGroups.length+1;s.fieldGroups.splice(Math.max(0,before-(action.index<before?1:0)),0,g);return s;
 }
 if(action.type==='field-play'){
  const ids=action.source===undefined?action.ids:release(action.source);
  const move=action.move;if(!move||!['discard','layoff','replace'].includes(move.type))fail('Choose a field move.');
  if(move.type==='discard')s.fieldGroups=[];
  try{cards(ids);return play(s,player,{...move,ids},random);}catch(error){if(!(error instanceof PlayerError))throw error;s.fieldNotice=error.message;return s;}
 }
 if(s.stage!=='meld')fail('Draw a card before building on the field.');
 if(s.turns<s.names.length)fail('No opening or melding during the first lap.');
 if(s.openingAttempt?.length)fail('Reset the old opening attempt before building on the field.');
 if(action.type==='field-stage'){
  available(action.ids);const at=Number.isInteger(action.before)?Math.max(0,Math.min(s.fieldGroups.length,action.before)):s.fieldGroups.length;s.fieldGroups.splice(at,0,{owner:player,ids:[...action.ids]});
 }else if(action.type==='field-merge'){
  const target=group(action.index);let ids;
  if(action.source!==undefined){if(action.source===action.index)return s;ids=release(action.source);}else{available(action.ids);ids=action.ids;}
  const at=Number.isInteger(action.position)?Math.max(0,Math.min(target.ids.length,action.position)):target.ids.length;target.ids.splice(at,0,...ids);
 }else if(action.type==='field-group'){
  if(!Array.isArray(action.indices)||new Set(action.indices).size!==action.indices.length||action.indices.length<2)fail('Choose two field groups.');
  const chosen=action.indices.map(group),first=Math.min(...action.indices),ids=chosen.flatMap(g=>g.ids);s.fieldGroups=s.fieldGroups.filter((_,i)=>!action.indices.includes(i));s.fieldGroups.splice(first,0,{owner:player,ids});
 }else fail('Unknown field action.');
 return settle();

 function settle(){
  const resolved=g=>resolveMeld(g.ids.map(id=>s.hands[player].find(c=>c.id===id)),{opening:!s.opened[player],rules});
  if(!s.opened[player]){
   const valid=s.fieldGroups.map(g=>({group:g,meld:resolved(g)})).filter(g=>g.meld),sum=valid.reduce((n,g)=>n+g.meld.points,0),ids=valid.flatMap(g=>g.group.ids);
   const finish=rules.handEnabled&&!rules.handRequiresOpening&&ids.length===s.hands[player].length-1&&(rules.handJokers||!s.hands[player].some(c=>c.joker));
   if(!valid.length||sum<(rules.opening||51)&&!finish)return s;
   const keep=s.fieldGroups.filter(g=>!valid.some(v=>v.group===g)),assignments=Object.fromEntries(valid.flatMap(v=>v.meld.cards.filter(c=>c.joker).map(c=>[c.id,c.as])));
   s.fieldGroups=[];
   try{s=play(s,player,{type:'open',groups:valid.map(v=>v.group.ids),assignments},random);}catch(error){if(!(error instanceof PlayerError))throw error;s.fieldNotice=error.message;}
   s.fieldGroups=keep;return s;
  }
  for(const g of [...s.fieldGroups]){
   const m=resolved(g);if(!m)continue;
   const keep=s.fieldGroups.filter(candidate=>candidate!==g),assignments=Object.fromEntries(m.cards.filter(c=>c.joker).map(c=>[c.id,c.as]));s.fieldGroups=[];
   try{s=play(s,player,{type:'meld',ids:g.ids,assignments},random);}catch(error){if(!(error instanceof PlayerError))throw error;s.fieldNotice=error.message;}
   s.fieldGroups=keep;
  }return s;
 }
}
