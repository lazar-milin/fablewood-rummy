import {resolveRummikub,createRummikub,playRummikub} from './rummikub.js';
import {fieldAction} from './field-building.js';
import {duplicatePairs} from './duplicate-deals.js';
// Errors meant for players; the server hides every other error's message.
export class PlayerError extends Error{}
export const SUITS=['fox','hare','toad','owl'];
export const RULESETS={remi51:{name:'Classic Rummy',opening:51},rummikub:{name:'Rummikub',opening:30}};
export const DEFAULT_RULES={opening:51,jokerCount:4,aceMode:'both',aceSeriesValue:'ten',firstLapDiscard:'take-no-open',jokerEnds:true,handEnabled:true,handRequiresOpening:true,handJokers:true,handBonus:80,handDouble:true,cutEnabled:true,cutBonus:120,dealDuplicateLimit:3,redealDuplicateLimit:0,turnOver4Sets:false,publicDiscardPile:true};
export const points=c=>c.joker?20:c.rank===1?10:Math.min(c.rank,10);
const rankOf=c=>c.joker?c.as?.rank:c.rank;
const suitOf=c=>c.joker?c.as?.suit:c.suit;
// Run jokers keep their declared positions. A set joker stays undeclared until
// the remaining animals identify exactly which card it represents.
export function resolveMeld(cards,{opening=false,kind=null,rules={}}={}){
 if(rules.variant==='rummikub')return resolveRummikub(cards);
 const options={...DEFAULT_RULES,...rules};
 if(cards.length<3||new Set(cards.map(c=>c.id)).size!==cards.length)return null;
 const wild=cards.filter(c=>c.joker&&!c.as),fixed=cards.filter(c=>!c.joker||c.as);
 const setWild=cards.filter(c=>c.joker),setFixed=cards.filter(c=>!c.joker);
 const jokerCount=cards.filter(c=>c.joker).length;
 if(!fixed.length||jokerCount>1&&kind!=='run')return null;
 if(kind!=='run'&&setFixed.length&&cards.length<=4&&new Set(setFixed.map(rankOf)).size===1&&new Set(setFixed.map(suitOf)).size===setFixed.length){
  const rank=rankOf(setFixed[0]),missing=SUITS.filter(s=>!setFixed.some(c=>suitOf(c)===s));
  if(missing.length>=setWild.length){
   const resolved=missing.length===setWild.length
    ?[...setFixed,...setWild.map((c,i)=>({...c,as:{suit:missing[i],rank}}))]
    :[...setFixed,...setWild.map(({as,...c})=>c)];
   return {kind:'set',cards:resolved,points:cards.length*points({rank})};
  }
 }
 if(kind==='set'||new Set(fixed.map(suitOf)).size!==1||cards.length>13)return null;
 const suit=suitOf(fixed[0]);
 for(const highAce of [false,true]){
  if(highAce&&options.aceMode==='low'||!highAce&&options.aceMode==='high'&&fixed.some(c=>rankOf(c)===1))continue;
  const value=c=>rankOf(c)===1&&highAce?14:rankOf(c),values=fixed.map(value);
  if(new Set(values).size!==values.length)continue;
  for(let start=highAce?2:1;start+cards.length-1<=(highAce?14:13);start++){
   if(values.some(n=>n<start||n>=start+cards.length))continue;
   const missing=Array.from({length:cards.length},(_,i)=>start+i).filter(n=>!values.includes(n));if(missing.length!==wild.length)continue;
   const resolved=[...fixed,...wild.map((c,i)=>({...c,as:{suit,rank:missing[i]===14?1:missing[i]}}))].sort((a,b)=>value(a)-value(b));
   if(!highAce&&options.aceMode==='high'&&resolved.some(c=>rankOf(c)===1))continue;
   if(resolved.some((c,i)=>c.joker&&resolved[i-1]?.joker))continue;
   if(!options.jokerEnds&&(resolved[0].joker||resolved.at(-1).joker))continue;
   const runPoints=resolved.reduce((n,c)=>n+(rankOf(c)===1&&!highAce&&options.aceSeriesValue==='one'?1:points({rank:rankOf(c)})),0);
   return {kind:'run',cards:resolved,points:runPoints};
  }
 }
 return null;
}
export function meldChoices(cards,{opening=false,rules={}}={}){
 const results=[],seen=new Set(),add=m=>{if(!m)return;const key=m.kind+'|'+m.cards.map(c=>c.id+':'+(c.as?.rank||c.rank)).join('|');if(!seen.has(key)){seen.add(key);results.push(m);}};
 if(cards.filter(c=>c.joker).length>1)return results;
 add(resolveMeld(cards,{opening,rules}));
 const real=cards.filter(c=>!c.joker),wild=cards.filter(c=>c.joker);
 if(!wild.length||!real.length||new Set(real.map(c=>c.suit)).size!==1)return results;
 for(const high of [false,true])for(let start=high?2:1;start+cards.length-1<=(high?14:13);start++){
  const values=real.map(c=>high&&c.rank===1?14:c.rank),range=Array.from({length:cards.length},(_,i)=>start+i);
  if(new Set(values).size!==values.length||values.some(n=>!range.includes(n)))continue;
  const missing=range.filter(n=>!values.includes(n));if(missing.length!==wild.length)continue;
  add(resolveMeld([...real,...wild.map((c,i)=>({...c,as:{suit:real[0].suit,rank:missing[i]===14?1:missing[i]}}))],{opening,kind:'run',rules}));
 }
 return results;
}
function declaredCards(cards,assignments={}){
 if(!assignments||typeof assignments!=='object'||Array.isArray(assignments))throw new PlayerError('Choose valid joker positions.');
 for(const [id,as] of Object.entries(assignments))if(!cards.some(c=>c.id===id&&c.joker)||!as||!SUITS.includes(as.suit)||!Number.isInteger(as.rank)||as.rank<1||as.rank>13)throw new PlayerError('Choose valid joker positions.');
 return cards.map(c=>c.joker&&assignments[c.id]?{...c,as:assignments[c.id]}:c);
}
export const validMeld=cards=>!!resolveMeld(cards);
export function createGame(names,options={},random=Math.random){
 if(options.variant==='rummikub')return createRummikub(names,options,random,PlayerError);
 if(![4,8].includes(options.jokerCount??4))throw new PlayerError("Choose four or eight jokers.");
 for(let attempt=0;attempt<1000;attempt++){const state=dealGame(names,options,random);if(!options.dealDuplicateLimit||state.hands.every(hand=>duplicatePairs(hand)<options.dealDuplicateLimit))return state;}
 throw new PlayerError('Could not deal within the duplicate limit. Please try again.');
}
function dealGame(names,options={},random=Math.random){
 options={...DEFAULT_RULES,...options};
 let deck=Array.from({length:2},(_,d)=>SUITS.flatMap(suit=>Array.from({length:13},(_,i)=>({id:`${d}-${suit}-${i+1}`,suit,rank:i+1})))).flat();
 deck.push(...Array.from({length:options.jokerCount},(_,i)=>({id:'joker-'+i,suit:'joker',rank:0,joker:true})));
 for(let i=deck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
 const count=options.handSize??14,first=options.first??0,cutter=(first+names.length-1)%names.length,hands=names.map(()=>[]);
 while(deck.at(-1)?.joker)hands[cutter].push(deck.pop());const cutCard=deck.pop();
 for(let i=0;i<names.length;i++)while(hands[i].length<count+(i===first?1:0))hands[i].push(deck.shift());
 return {names,hands,stock:deck,cutCard,discard:[],melds:[],turn:first,first,stage:'meld',turns:0,opened:names.map(()=>false),winner:null,log:[`Classic Rummy: opening ${options.opening}. The first player starts with one extra card and discards.`],scores:names.map(()=>0),turnStarted:Date.now(),options:{undo:true,timer:0,...options},mustOpen:false,mustHand:false,fromCut:false,handUsedJokers:false,openedThisTurn:false,laidOffThisTurn:false,pendingJokers:[],openingAttempt:[],fieldGroups:[],fieldNotice:null};
}
export function play(state,player,action,random=Math.random){
 if(state.options.variant==='rummikub')return playRummikub(state,player,action,{PlayerError,candidateMelds},random);
 const s=structuredClone(state);s.fieldNotice=null;if(s.winner!==null)throw new PlayerError('The round has ended.');if(player!==s.turn)throw new PlayerError('It is not your turn.');
 if(action.type?.startsWith('field-'))return fieldAction(s,player,action,{play,resolveMeld,PlayerError},random);
 const hand=s.hands[player],firstLap=s.turns<s.names.length,rules={...DEFAULT_RULES,...s.options};
 const pick=ids=>{if(!Array.isArray(ids)||new Set(ids).size!==ids.length)throw new PlayerError('Choose each card once.');const cs=ids.map(id=>hand.find(c=>c.id===id));if(cs.some(c=>!c))throw new PlayerError('Choose cards from your hand.');return cs;};
 const remove=cs=>{for(const c of cs){hand.splice(hand.findIndex(x=>x.id===c.id),1);s.pendingJokers=s.pendingJokers.filter(id=>id!==c.id);}};
 const reserve=cs=>{if(hand.length-cs.length<1)throw new PlayerError('Keep one card for the final discard.');};
 const log=t=>s.log.push(`${s.names[player]} ${t}`);
 const drafted=new Set((s.fieldGroups||[]).flatMap(g=>g.ids));
 if(['open','stage-open','meld','layoff','replace'].includes(action.type)&&(action.ids||action.groups?.flat()||[]).some(id=>drafted.has(id)))throw new PlayerError('Return those cards from the field before playing them.');
 if(action.type==='discard'&&s.fieldGroups?.length){s.fieldGroups=[];try{return play(s,player,action,random);}catch(error){if(!(error instanceof PlayerError))throw error;s.fieldNotice=error.message;return s;}}
 if(action.type==='draw'){
  if(s.stage!=='draw')throw new PlayerError('You have already drawn, or hold the opening extra card.');
  if(!['stock','discard','cut'].includes(action.source))throw new PlayerError('Choose a draw pile.');
  if(action.source==='discard'&&firstLap&&rules.firstLapDiscard==='blocked')throw new PlayerError('Taking from the discard pile is disabled during the first lap.');
  if(action.source==='cut'){
   if(firstLap||s.opened[player]||!s.cutCard||!rules.handEnabled||!rules.cutEnabled)throw new PlayerError('The cut card is only for an enabled finish from a closed hand.');
   hand.push(s.cutCard);s.cutCard=null;s.mustHand=true;s.mustOpen=true;s.fromCut=true;log('took the cut card and must finish from hand.');
  }else{
   if(action.source==='stock'&&!s.stock.length){if(s.discard.length<2)throw new PlayerError('Stock is empty. Take the discard or end a blocked round.');const top=s.discard.pop();s.stock=s.discard;s.discard=[top];for(let i=s.stock.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[s.stock[i],s.stock[j]]=[s.stock[j],s.stock[i]];}}
   const c=s[action.source].pop();if(!c)throw new PlayerError('That pile is empty.');hand.push(c);
   s.mustOpen=action.source==='discard'&&!firstLap&&!s.opened[player];log(`drew from the ${action.source}.`);
  }
  s.stage='meld';return s;
 }
 if(s.stage!=='meld')throw new PlayerError('Draw a card first.');
 if(['open','stage-open','meld','layoff','replace'].includes(action.type)&&firstLap)throw new PlayerError('No opening or melding during the first lap.');
 if(action.type==='reset-open'){
  if(s.opened[player]||!s.openingAttempt?.length)throw new PlayerError('There is no opening attempt to reset.');s.openingAttempt=[];return s;
 }
 if(action.type==='unstage-open'){
  if(s.opened[player]||!s.openingAttempt?.[action.index])throw new PlayerError('Choose a provisional meld.');s.openingAttempt.splice(action.index,1);return s;
 }
 if(action.type==='stage-open'){
  if(s.opened[player])throw new PlayerError('You are already open.');
  const prior=s.openingAttempt||[],used=prior.flatMap(g=>g.ids),cards=pick(action.ids);if(cards.some(c=>used.includes(c.id)))throw new PlayerError('That card is already in the opening attempt.');
  reserve(pick([...used,...action.ids]));const declared=declaredCards(cards,action.assignments),meld=resolveMeld(declared,{opening:true,rules});if(!meld)throw new PlayerError('Drop a complete meld with at most one joker to try opening.');
  s.openingAttempt=[...prior,{ids:cards.map(c=>c.id),assignments:Object.fromEntries(meld.cards.filter(c=>c.joker).map(c=>[c.id,c.as]))}];
  const groups=s.openingAttempt.map(g=>g.ids),assignments=Object.assign({},...s.openingAttempt.map(g=>g.assignments)),sum=s.openingAttempt.reduce((n,g)=>n+resolveMeld(declaredCards(pick(g.ids),g.assignments),{opening:true,rules}).points,0);
  const finishBypass=rules.handEnabled&&!rules.handRequiresOpening&&groups.flat().length===hand.length-1&&(rules.handJokers||!hand.some(c=>c.joker));
  if(sum>=rules.opening||finishBypass){s.openingAttempt=[];return play(s,player,{type:'open',groups,assignments},random);}return s;
 }
 if(action.type==='open'){
  if(s.openingAttempt?.length)throw new PlayerError('Reset the provisional attempt before a manual opening.');
  if(s.opened[player])throw new PlayerError('You are already open.');
  const groups=action.groups||[],cards=pick(groups.flat());reserve(cards);if(!groups.length)throw new PlayerError('Stage your opening groups first.');
  const declared=declaredCards(cards,action.assignments);const resolved=groups.map(ids=>resolveMeld(ids.map(id=>declared.find(c=>c.id===id)),{opening:true,rules}));if(resolved.some(m=>!m))throw new PlayerError('Each group must follow the selected ace and joker rules, with at most one joker.');
  const sum=resolved.reduce((n,m)=>n+m.points,0),usesJoker=cards.some(c=>c.joker),finishOnly=rules.handEnabled&&!rules.handRequiresOpening&&cards.length===hand.length-1&&(rules.handJokers||!hand.some(c=>c.joker));
  if(sum<rules.opening&&!finishOnly)throw new PlayerError(`Opening is ${sum}; at least ${rules.opening} points are needed.`);
  if(s.fromCut&&!rules.handJokers&&hand.some(c=>c.joker))throw new PlayerError('This table does not allow jokers when finishing from hand.');
  if(sum<rules.opening)s.mustHand=true;
  s.handUsedJokers=usesJoker;s.opened[player]=true;s.openedThisTurn=true;s.mustOpen=false;for(const m of resolved)s.melds.push({...m,owner:player});remove(cards);log(`opened with ${sum} points.`);
 }else if(action.type==='meld'){
  if(!s.opened[player])throw new PlayerError(`Group ${rules.opening} points to open first.`);const cards=pick(action.ids);reserve(cards);const m=resolveMeld(declaredCards(cards,action.assignments),{opening:false,rules});if(!m)throw new PlayerError('Choose a valid run or set under this table’s rules.');s.handUsedJokers ||= cards.some(c=>c.joker);s.melds.push({...m,owner:player});remove(cards);log('laid a meld.');
 }else if(action.type==='layoff'){
  if(!s.opened[player]||s.mustHand)throw new PlayerError('Open before adding to melds. A hand-only finish must use your own groups.');const cards=pick(action.ids);reserve(cards);const m=s.melds[action.index];if(!m||!cards.length||cards.filter(c=>c.joker).length>1||m.kind==='set'&&cards.some(c=>c.joker))throw new PlayerError('You cannot add those cards to this meld.');const result=resolveMeld([...m.cards,...cards],{kind:m.kind,rules});if(!result)throw new PlayerError('Those cards do not extend this meld under the selected rules.');s.melds[action.index]={...result,owner:m.owner};remove(cards);s.laidOffThisTurn=true;log('extended a meld.');
 }else if(action.type==='replace'){
  if(!s.opened[player]||s.mustHand)throw new PlayerError('Open before reclaiming a joker.');const cards=pick(action.ids),m=s.melds[action.index],j=m?.cards.find(c=>c.id===action.jokerId&&c.joker),setRank=m?.kind==='set'?m.cards.find(c=>!c.joker)?.rank:null,representedRank=m?.kind==='set'?setRank:j?.as?.rank;
  if(m?.kind==='set'&&(m.cards.length!==4||!j?.as))throw new PlayerError('A set joker can only be reclaimed from a complete four-card set.');
  if(cards.length!==1||cards[0].joker||!j||!Number.isInteger(representedRank)||cards[0].rank!==representedRank||(m.kind==='set'?m.cards.some(c=>!c.joker&&c.suit===cards[0].suit):cards[0].suit!==j.as?.suit))throw new PlayerError('Select a missing animal of this rank for a set, or the exact card represented in a run.');m.cards[m.cards.indexOf(j)]=cards[0];const resolved=resolveMeld(m.cards,{kind:m.kind,rules});if(!resolved)throw new PlayerError('That card cannot replace this joker.');s.melds[action.index]={...resolved,owner:m.owner};remove(cards);delete j.as;hand.push(j);s.pendingJokers.push(j.id);s.laidOffThisTurn=true;log('reclaimed a joker, to use in a new meld this turn.');
 }else if(action.type==='discard'){
  if(s.openingAttempt?.length)throw new PlayerError('Complete or reset your opening attempt before discarding.');
  if(s.mustOpen)throw new PlayerError(`This draw requires an opening of ${rules.opening} points. Cancel the draw to choose again.`);if(s.mustHand&&hand.length!==1)throw new PlayerError('You must finish from hand this turn.');
  const cards=pick(action.ids),jokers=cards.filter(c=>c.joker),ordinary=cards.filter(c=>!c.joker);
  // A reclaimed joker that can't go into a new meld may only leave the hand buried with an ordinary card.
  if(s.pendingJokers.some(id=>!cards.some(c=>c.id===id)))throw new PlayerError('Use the reclaimed joker in a new meld, or bury it with one ordinary card.');
  const lastJokers=cards.length===hand.length&&jokers.length===cards.length;
  if(!(cards.length===1&&!jokers.length||cards.length===2&&jokers.length===1&&ordinary.length===1||lastJokers))throw new PlayerError('Discard one card. Bury a joker with one ordinary card, unless it is your final card.');
  remove(cards);s.discard.push(...jokers,...ordinary);log(jokers.length?'discarded a joker.':'discarded a card.');
  if(!hand.length){s.winner=player;s.handFinish=rules.handEnabled&&s.openedThisTurn&&!s.laidOffThisTurn&&(rules.handJokers||!s.handUsedJokers&&!jokers.length);s.scores=s.hands.map((h,i)=>i===player?(s.handFinish?-(s.fromCut?rules.cutBonus:rules.handBonus):-40):(s.opened[i]?h.reduce((n,c)=>n+points(c),0):100)*(s.handFinish&&rules.handDouble?2:1));log(s.handFinish?'finished from hand!':'closed the round!');}
  else{s.turn=(s.turn+1)%s.names.length;s.stage='draw';s.turns++;s.turnStarted=Date.now();s.mustOpen=false;s.mustHand=false;s.fromCut=false;s.handUsedJokers=false;s.openedThisTurn=false;s.laidOffThisTurn=false;}
 }else throw new PlayerError('Unknown action.');
 return s;
}
export function candidateMelds(hand,rules={},opening=true){
 const out=[],seen=new Set(),wild=hand.filter(c=>c.joker);
 const add=cs=>{const key=cs.map(c=>c.id).sort().join('|');if(seen.has(key))return;const m=resolveMeld(cs,{opening,rules});if(m){seen.add(key);out.push({...m,ids:cs.map(c=>c.id)});}};
 for(let rank=1;rank<=13;rank++){const bySuit=SUITS.map(s=>hand.find(c=>!c.joker&&c.rank===rank&&c.suit===s)).filter(Boolean);if(bySuit.length>=3){add(bySuit);if(bySuit.length===4)for(let i=0;i<4;i++)add(bySuit.filter((_,j)=>j!==i));}if(!opening&&bySuit.length)for(let n=2;n<=Math.min(wild.length,4-bySuit.length);n++)add([...bySuit,...wild.slice(0,n)]);if(bySuit.length>=2)for(const j of wild){add([...bySuit.slice(0,2),j]);if(bySuit.length===3)add([...bySuit,j]);}}
 for(const suit of SUITS)for(const high of [false,true]){const get=n=>hand.find(c=>!c.joker&&c.suit===suit&&c.rank===(n===14?1:n));for(let start=high?2:1;start<=12;start++)for(let end=start+2;end<=(high?14:13);end++){const range=Array.from({length:end-start+1},(_,i)=>get(start+i)),miss=range.filter(c=>!c).length;if(!miss)add(range);else if(miss>0&&miss<=wild.length&&(!opening||miss===1)){for(let offset=0;offset+miss<=wild.length;offset++){let i=offset;add(range.map(c=>c||wild[i++]));}}}}
 return out.sort((a,b)=>b.ids.length-a.ids.length||b.points-a.points);
}
export function findOpening(hand,{finish=false,rules={}}={}){
 const options={...DEFAULT_RULES,...rules},candidates=candidateMelds(hand,options);let best=null,nodes=0;
 function visit(start,used,groups,sum){if(++nodes>12000)return;const finishBypass=options.handEnabled&&!options.handRequiresOpening&&used.size===hand.length-1&&(options.handJokers||!hand.some(c=>c.joker));if(groups.length&&(sum>=options.opening||finishBypass)&&used.size<hand.length&&(!finish||used.size===hand.length-1)){if(!best||used.size>best.count)best={groups:groups.map(m=>m.ids),points:sum,count:used.size};if(finish)return;}
  for(let i=start;i<candidates.length;i++){const m=candidates[i];if(m.ids.some(id=>used.has(id))||used.size+m.ids.length>=hand.length)continue;visit(i+1,new Set([...used,...m.ids]),[...groups,m],sum+m.points);if(finish&&best)return;}
 }visit(0,new Set(),[],0);return best;
}
export function botAction(s){
 if(s.options.variant==='rummikub')return {type:'rk-auto'};
 const p=s.turn,hand=s.hands[p],firstLap=s.turns<s.names.length;
 if(s.fieldGroups?.length)return {type:'field-return'};
 if(s.stage==='draw')return {type:'draw',source:'stock'};
 if(!firstLap){
  if(!s.opened[p]){const opening=findOpening(hand,{rules:s.options});if(opening)return {type:'open',groups:opening.groups};}
  else{
   for(const m of candidateMelds(hand,s.options,false))if(m.ids.length<hand.length)return {type:'meld',ids:m.ids};
   if(hand.length>1)for(let index=0;index<s.melds.length;index++)for(const c of hand){const m=s.melds[index];if(m.kind==='set'&&c.joker)continue;if(resolveMeld([...m.cards,c],{kind:m.kind,rules:s.options}))return {type:'layoff',index,ids:[c.id]};}
  }
 }
 return botDiscard(s);
}
// The least useful legal discard; also the server's fallback when any other automatic move is rejected.
export function botDiscard(s){
 if(s.options.variant==='rummikub')return {type:'draw',source:'stock'};
 const hand=s.hands[s.turn],pending=hand.filter(c=>s.pendingJokers.includes(c.id));
 const potential=c=>hand.reduce((n,o)=>n+(o.id!==c.id&&!o.joker?(o.rank===c.rank?4:0)+(o.suit===c.suit&&Math.abs(o.rank-c.rank)<=2?2:0):0),0);
 const ordinary=hand.filter(c=>!c.joker).sort((a,b)=>potential(a)-potential(b)||points(b)-points(a));
 if(pending.length&&ordinary.length)return {type:'discard',ids:[pending[0].id,ordinary[0].id]};
 if(ordinary.length)return {type:'discard',ids:[ordinary[0].id]};return {type:'discard',ids:hand.map(c=>c.id)};
}
