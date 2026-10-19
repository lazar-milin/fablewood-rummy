export const SUITS=['fox','hare','toad','owl'];
export const RULESETS={remi51:{name:'Classic Rummy',opening:51}};
export const DEFAULT_RULES={opening:51,aceMode:'both',jokerEnds:true,handEnabled:true,handRequiresOpening:true,handJokers:true,handBonus:80,handDouble:true,cutEnabled:true,cutBonus:120};
export const points=c=>c.joker?20:c.rank===1?10:Math.min(c.rank,10);
const rankOf=c=>c.joker?c.as?.rank:c.rank;
const suitOf=c=>c.joker?c.as?.suit:c.suit;
// Wildcards keep their declared position when a table meld grows.
export function resolveMeld(cards,{opening=false,kind=null,rules={}}={}){
 const options={...DEFAULT_RULES,...rules};
 if(cards.length<3||new Set(cards.map(c=>c.id)).size!==cards.length)return null;
 const wild=cards.filter(c=>c.joker&&!c.as),fixed=cards.filter(c=>!c.joker||c.as);
 if(!fixed.length||opening&&cards.filter(c=>c.joker).length>1)return null;
 if(kind!=='run'&&cards.length<=4&&new Set(fixed.map(rankOf)).size===1&&new Set(fixed.map(suitOf)).size===fixed.length){
  const rank=rankOf(fixed[0]),missing=SUITS.filter(s=>!fixed.some(c=>suitOf(c)===s));
  if(missing.length>=wild.length){const resolved=[...fixed,...wild.map((c,i)=>({...c,as:{suit:missing[i],rank}}))];return {kind:'set',cards:resolved,points:resolved.reduce((n,c)=>n+points({rank:rankOf(c)}),0)};}
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
   if(!options.jokerEnds&&(resolved[0].joker||resolved.at(-1).joker))continue;
   return {kind:'run',cards:resolved,points:resolved.reduce((n,c)=>n+points({rank:rankOf(c)}),0)};
  }
 }
 return null;
}
export const validMeld=cards=>!!resolveMeld(cards);
export function createGame(names,options={},random=Math.random){
 options={...DEFAULT_RULES,...options};
 let deck=Array.from({length:2},(_,d)=>SUITS.flatMap(suit=>Array.from({length:13},(_,i)=>({id:`${d}-${suit}-${i+1}`,suit,rank:i+1})))).flat();
 deck.push(...Array.from({length:4},(_,i)=>({id:'joker-'+i,suit:'joker',rank:0,joker:true})));
 for(let i=deck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
 const count=options.handSize??14,first=options.first??0,cutter=(first+names.length-1)%names.length,hands=names.map(()=>[]);
 while(deck.at(-1)?.joker)hands[cutter].push(deck.pop());const cutCard=deck.pop();
 for(let i=0;i<names.length;i++)while(hands[i].length<count+(i===first?1:0))hands[i].push(deck.shift());
 return {names,hands,stock:deck,cutCard,discard:[],melds:[],turn:first,first,stage:'meld',turns:0,opened:names.map(()=>false),winner:null,log:[`Classic Rummy: opening ${options.opening}. The first player starts with one extra card and discards.`],scores:names.map(()=>0),turnStarted:Date.now(),options:{undo:true,timer:0,...options},mustOpen:false,mustHand:false,fromCut:false,handUsedJokers:false,openedThisTurn:false,laidOffThisTurn:false,pendingJokers:[]};
}
export function play(state,player,action){
 const s=structuredClone(state);if(s.winner!==null)throw Error('The round has ended.');if(player!==s.turn)throw Error('It is not your turn.');
 const hand=s.hands[player],firstLap=s.turns<s.names.length,rules={...DEFAULT_RULES,...s.options};
 const pick=ids=>{if(!Array.isArray(ids)||new Set(ids).size!==ids.length)throw Error('Choose each card once.');const cs=ids.map(id=>hand.find(c=>c.id===id));if(cs.some(c=>!c))throw Error('Choose cards from your hand.');return cs;};
 const remove=cs=>{for(const c of cs){hand.splice(hand.findIndex(x=>x.id===c.id),1);s.pendingJokers=s.pendingJokers.filter(id=>id!==c.id);}};
 const reserve=cs=>{if(hand.length-cs.length<1)throw Error('Keep one card for the final discard.');};
 const log=t=>s.log.push(`${s.names[player]} ${t}`);
 if(action.type==='draw'){
  if(s.stage!=='draw')throw Error('You have already drawn, or hold the opening extra card.');
  if(!['stock','discard','cut'].includes(action.source))throw Error('Choose a draw pile.');
  if(action.source==='cut'){
   if(firstLap||s.opened[player]||!s.cutCard||!rules.handEnabled||!rules.cutEnabled)throw Error('The cut card is only for an enabled finish from a closed hand.');
   hand.push(s.cutCard);s.cutCard=null;s.mustHand=true;s.mustOpen=true;s.fromCut=true;log('took the cut card and must finish from hand.');
  }else{
   if(action.source==='stock'&&!s.stock.length){if(s.discard.length<2)throw Error('Stock is empty. Take the discard or end a blocked round.');const top=s.discard.pop();s.stock=s.discard;s.discard=[top];for(let i=s.stock.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[s.stock[i],s.stock[j]]=[s.stock[j],s.stock[i]];}}
   const c=s[action.source].pop();if(!c)throw Error('That pile is empty.');hand.push(c);
   s.mustOpen=action.source==='discard'&&!firstLap&&!s.opened[player];log(`drew from the ${action.source}.`);
  }
  s.stage='meld';return s;
 }
 if(s.stage!=='meld')throw Error('Draw a card first.');
 if(['open','meld','layoff','replace'].includes(action.type)&&firstLap)throw Error('No opening or melding during the first lap.');
 if(action.type==='open'){
  if(s.opened[player])throw Error('You are already open.');
  const groups=action.groups||[],cards=pick(groups.flat());reserve(cards);if(!groups.length)throw Error('Stage your opening groups first.');
  const resolved=groups.map(ids=>resolveMeld(pick(ids),{opening:true,rules}));if(resolved.some(m=>!m))throw Error('Each group must follow the selected ace and joker rules, with at most one joker.');
  const sum=resolved.reduce((n,m)=>n+m.points,0),usesJoker=cards.some(c=>c.joker),finishOnly=rules.handEnabled&&!rules.handRequiresOpening&&cards.length===hand.length-1&&(rules.handJokers||!hand.some(c=>c.joker));
  if(sum<rules.opening&&!finishOnly)throw Error(`Opening is ${sum}; at least ${rules.opening} points are needed.`);
  if(s.fromCut&&!rules.handJokers&&hand.some(c=>c.joker))throw Error('This table does not allow jokers when finishing from hand.');
  if(sum<rules.opening)s.mustHand=true;
  s.handUsedJokers=usesJoker;s.opened[player]=true;s.openedThisTurn=true;s.mustOpen=false;for(const m of resolved)s.melds.push({...m,owner:player});remove(cards);log(`opened with ${sum} points.`);
 }else if(action.type==='meld'){
  if(!s.opened[player])throw Error(`Group ${rules.opening} points to open first.`);const cards=pick(action.ids);reserve(cards);const m=resolveMeld(cards,{opening:true,rules});if(!m)throw Error('Choose a valid run or set under this table’s rules.');s.handUsedJokers ||= cards.some(c=>c.joker);s.melds.push({...m,owner:player});remove(cards);log('laid a meld.');
 }else if(action.type==='layoff'){
  if(!s.opened[player]||s.mustHand)throw Error('Open before adding to melds. A hand-only finish must use your own groups.');const cards=pick(action.ids);reserve(cards);const m=s.melds[action.index];if(!m||!cards.length||m.kind==='set'&&cards.some(c=>c.joker))throw Error('You cannot add those cards to this meld.');const result=resolveMeld([...m.cards,...cards],{kind:m.kind,rules});if(!result)throw Error('Those cards do not extend this meld under the selected rules.');s.melds[action.index]={...result,owner:m.owner};remove(cards);s.laidOffThisTurn=true;log('extended a meld.');
 }else if(action.type==='replace'){
  if(!s.opened[player]||s.mustHand)throw Error('Open before reclaiming a joker.');const cards=pick(action.ids),m=s.melds[action.index],j=m?.cards.find(c=>c.id===action.jokerId&&c.joker);if(cards.length!==1||cards[0].joker||!j||cards[0].rank!==j.as.rank||cards[0].suit!==j.as.suit)throw Error('Select the exact card represented by that joker.');m.cards[m.cards.indexOf(j)]=cards[0];remove(cards);delete j.as;hand.push(j);s.pendingJokers.push(j.id);s.laidOffThisTurn=true;log('reclaimed a joker, to use in a new meld this turn.');
 }else if(action.type==='discard'){
  if(s.mustOpen)throw Error(`This draw requires an opening of ${rules.opening} points. Cancel the draw to choose again.`);if(s.mustHand&&hand.length!==1)throw Error('You must finish from hand this turn.');if(s.pendingJokers.length)throw Error('Use reclaimed jokers in a new meld before discarding.');
  const cards=pick(action.ids),jokers=cards.filter(c=>c.joker),ordinary=cards.filter(c=>!c.joker);
  const lastJokers=cards.length===hand.length&&jokers.length===cards.length;
  if(!(cards.length===1&&!jokers.length||cards.length===2&&jokers.length===1&&ordinary.length===1||lastJokers))throw Error('Discard one card. Bury a joker with one ordinary card, unless it is your final card.');
  remove(cards);s.discard.push(...jokers,...ordinary);log(jokers.length?'discarded a joker.':'discarded a card.');
  if(!hand.length){s.winner=player;s.handFinish=rules.handEnabled&&s.openedThisTurn&&!s.laidOffThisTurn&&(rules.handJokers||!s.handUsedJokers&&!jokers.length);s.scores=s.hands.map((h,i)=>i===player?(s.handFinish?-(s.fromCut?rules.cutBonus:rules.handBonus):-40):(s.opened[i]?h.reduce((n,c)=>n+points(c),0):100)*(s.handFinish&&rules.handDouble?2:1));log(s.handFinish?'finished from hand!':'closed the round!');}
  else{s.turn=(s.turn+1)%s.names.length;s.stage='draw';s.turns++;s.turnStarted=Date.now();s.mustOpen=false;s.mustHand=false;s.fromCut=false;s.handUsedJokers=false;s.openedThisTurn=false;s.laidOffThisTurn=false;}
 }else throw Error('Unknown action.');
 return s;
}
export function candidateMelds(hand,rules={}){
 const out=[],seen=new Set(),wild=hand.filter(c=>c.joker);
 const add=cs=>{const key=cs.map(c=>c.id).sort().join('|');if(seen.has(key))return;const m=resolveMeld(cs,{opening:true,rules});if(m){seen.add(key);out.push({...m,ids:cs.map(c=>c.id)});}};
 for(let rank=1;rank<=13;rank++){const bySuit=SUITS.map(s=>hand.find(c=>!c.joker&&c.rank===rank&&c.suit===s)).filter(Boolean);if(bySuit.length>=3){add(bySuit);if(bySuit.length===4)for(let i=0;i<4;i++)add(bySuit.filter((_,j)=>j!==i));}if(bySuit.length>=2)for(const j of wild){add([...bySuit.slice(0,2),j]);if(bySuit.length===3)add([...bySuit,j]);}}
 for(const suit of SUITS)for(const high of [false,true]){const get=n=>hand.find(c=>!c.joker&&c.suit===suit&&c.rank===(n===14?1:n));for(let start=high?2:1;start<=12;start++)for(let end=start+2;end<=(high?14:13);end++){const range=Array.from({length:end-start+1},(_,i)=>get(start+i)),miss=range.filter(c=>!c).length;if(!miss)add(range);else if(miss===1)for(const j of wild)add(range.map(c=>c||j));}}
 return out.sort((a,b)=>b.ids.length-a.ids.length||b.points-a.points);
}
export function findOpening(hand,{finish=false,rules={}}={}){
 const options={...DEFAULT_RULES,...rules},candidates=candidateMelds(hand,options);let best=null,nodes=0;
 function visit(start,used,groups,sum){if(++nodes>12000)return;const finishBypass=options.handEnabled&&!options.handRequiresOpening&&used.size===hand.length-1&&(options.handJokers||!groups.some(m=>m.cards.some(c=>c.joker)));if(groups.length&&(sum>=options.opening||finishBypass)&&used.size<hand.length&&(!finish||used.size===hand.length-1)){if(!best||used.size>best.count)best={groups:groups.map(m=>m.ids),points:sum,count:used.size};if(finish)return;}
  for(let i=start;i<candidates.length;i++){const m=candidates[i];if(m.ids.some(id=>used.has(id))||used.size+m.ids.length>=hand.length)continue;visit(i+1,new Set([...used,...m.ids]),[...groups,m],sum+m.points);if(finish&&best)return;}
 }visit(0,new Set(),[],0);return best;
}
export function botAction(s){
 const p=s.turn,hand=s.hands[p],firstLap=s.turns<s.names.length;
 if(s.stage==='draw')return {type:'draw',source:'stock'};
 if(!firstLap){
  if(!s.opened[p]){const opening=findOpening(hand,{rules:s.options});if(opening)return {type:'open',groups:opening.groups};}
  else{
   for(const m of candidateMelds(hand,s.options))if(m.ids.length<hand.length)return {type:'meld',ids:m.ids};
   if(hand.length>1)for(let index=0;index<s.melds.length;index++)for(const c of hand){const m=s.melds[index];if(m.kind==='set'&&c.joker)continue;if(resolveMeld([...m.cards,c],{kind:m.kind,rules:s.options}))return {type:'layoff',index,ids:[c.id]};}
  }
 }
 const potential=c=>hand.reduce((n,o)=>n+(o.id!==c.id&&!o.joker?(o.rank===c.rank?4:0)+(o.suit===c.suit&&Math.abs(o.rank-c.rank)<=2?2:0):0),0);
 const ordinary=hand.filter(c=>!c.joker).sort((a,b)=>potential(a)-potential(b)||points(b)-points(a));
 if(ordinary.length)return {type:'discard',ids:[ordinary[0].id]};return {type:'discard',ids:hand.map(c=>c.id)};
}
