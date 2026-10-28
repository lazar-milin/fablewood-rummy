import {SUITS,points} from './engine.js';

export const HUNT_ESCAPE_RULES={variant:'hunt-escape',handSize:9,opening:0,deckCount:4,jokerCount:8,hunterSuits:['fox','owl'],preySuits:['hare','toad']};
const otherRole=role=>role==='hunt'?'escape':'hunt';
const family=(card,rules)=>card.joker?null:rules.hunterSuits.includes(card.suit)?'hunt':'escape';

export function resolveHuntEscapeMeld(cards,{role=null,rules=HUNT_ESCAPE_RULES}={}){
 if(!Array.isArray(cards)||cards.length<2||cards.some(c=>!c)||new Set(cards.map(c=>c.id)).size!==cards.length)return null;
 const jokers=cards.filter(c=>c.joker),wild=jokers.filter(c=>!c.as),fixed=cards.filter(c=>!c.joker),deckCount=rules.deckCount||4;if(!fixed.length||jokers.length>1)return null;
 let kind=null,ordered=[...cards];
 if(fixed.every(c=>rules.hunterSuits.includes(c.suit))&&new Set(fixed.map(c=>c.rank)).size===1){
  const rank=fixed[0].rank,counts=new Map();for(const c of fixed)counts.set(c.suit,(counts.get(c.suit)||0)+1);
  if(jokers.length){const joker=jokers[0],assigned=joker.as?.suit;if(joker.as?.rank&&joker.as.rank!==rank||assigned&&!rules.hunterSuits.includes(assigned))return null;let suit=assigned;if(!suit)suit=rules.hunterSuits.find(candidate=>(counts.get(candidate)||0)<deckCount&&!counts.has(candidate))||rules.hunterSuits.find(candidate=>(counts.get(candidate)||0)<deckCount);if(!suit)return null;counts.set(suit,(counts.get(suit)||0)+1);ordered=[...fixed,{...joker,as:{suit,rank}}];}
  if([...counts.values()].every(n=>n<=deckCount)&&(counts.size>=2||[...counts.values()].some(n=>n>=2)))kind='set';
  if(kind)return role&&role!=='hunt'?null:{kind,cards:ordered,points:cards.length*points({rank}),rank};
 }
 const runFixed=[...fixed,...jokers.filter(c=>c.as)];
 if(cards.length>=3&&runFixed.every(c=>rules.preySuits.includes(c.as?.suit||c.suit))){
  const suit=runFixed[0].as?.suit||runFixed[0].suit;if(runFixed.some(c=>(c.as?.suit||c.suit)!==suit))return null;
  for(const highAce of [false,true]){const value=rank=>highAce&&rank===1?14:rank,used=runFixed.map(c=>value(c.as?.rank||c.rank));if(new Set(used).size!==used.length)continue;
   for(let start=highAce?2:1;start+cards.length-1<=(highAce?14:13);start++){const range=Array.from({length:cards.length},(_,i)=>start+i);if(used.some(n=>!range.includes(n)))continue;const holes=range.filter(n=>!used.includes(n));if(holes.length!==wild.length)continue;const assigned=wild.map((c,i)=>({...c,as:{suit,rank:holes[i]===14?1:holes[i]}})),byValue=new Map(runFixed.map(c=>[value(c.as?.rank||c.rank),c]));holes.forEach((n,i)=>byValue.set(n,assigned[i]));ordered=range.map(n=>byValue.get(n));if(ordered.some((c,i)=>c.joker&&ordered[i-1]?.joker))continue;kind='run';break;}
   if(kind)break;
  }
  if(kind)return role&&role!=='escape'?null:{kind,cards:ordered,points:ordered.reduce((n,c)=>n+points(c),0),suit};
 }
 return null;
}

export function createHuntEscape(names,options={},random=Math.random){
 const rules={...HUNT_ESCAPE_RULES,...options},deck=Array.from({length:rules.deckCount},(_,copy)=>SUITS.flatMap(suit=>Array.from({length:13},(_,i)=>({id:`${copy}-${suit}-${i+1}`,suit,rank:i+1})))).flat();deck.push(...Array.from({length:rules.jokerCount},(_,i)=>({id:`joker-${i}`,suit:'joker',rank:0,joker:true})));
 for(let i=deck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
 const count=rules.handSize??9,hands=names.map(()=>deck.splice(0,count));
 return {names,hands,stock:deck,discard:[],discardPiles:[[],[]],cleanseIndicators:[[],[]],drawState:null,pendingDiscard:null,melds:[],fieldGroups:[],openingAttempt:[],turn:options.first??0,first:options.first??0,stage:'first-discard',turns:0,roles:names.map(()=>null),opened:names.map(()=>false),stalkTracks:names.map(()=>0),discardSurges:names.map(()=>0),quenchCount:0,hurryDraw:names.map(()=>0),discardRequired:2,skipDiscard:false,pendingTurnEnd:false,winner:null,scores:names.map(()=>0),turnStarted:Date.now(),options:rules,mustOpen:false,mustHand:false,fromCut:false,handUsedJokers:false,openedThisTurn:false,laidOffThisTurn:false,pendingJokers:[],meldedThisTurn:false,pendingEffect:null,log:['Sylvan Trail: each player starts with nine cards and chooses a spirit with the first discard.']};
}

function hurryCount(s,player){const value=s.hurryDraw?.[player];return value===true?1:Math.max(0,Number(value)||0);}
function drawTarget(s,player){const hurried=hurryCount(s,player);return hurried?Math.max(0,2-hurried):s.hands[player].length<7?7-s.hands[player].length:2;}

function scoreState(s,winner){s.winner=winner;s.scores=s.hands.map((hand,i)=>i===winner?0:(s.opened[i]?hand.reduce((n,c)=>n+points(c),0):100));s.log.push(`${s.names[winner]} wins by ${s.roles[winner]==='hunt'?'Hunt':'Escape'}!`);}
function qualifies(s,player){
 const role=s.roles[player],live=s.melds.filter(m=>!m.closed&&(!m.stalkedUntilTurn||s.turns>=m.stalkedUntilTurn));
 if(role==='hunt'){
  const sets=live.filter(m=>m.owner===player&&m.kind==='set'),ranks=new Set(sets.map(m=>m.rank));
  if(ranks.size>=3&&sets.reduce((n,m)=>n+m.cards.length,0)>=9)return true;
 }
 if(role==='escape'){
  const runs=live.filter(m=>m.owner===player&&m.kind==='run'),long=new Set(runs.filter(m=>m.cards.length>=5).map(m=>m.suit)),short=runs.some(m=>m.cards.length>=4&&[...long].some(suit=>suit!==m.suit));
  if(short&&runs.reduce((n,m)=>n+m.cards.length,0)>=9)return true;
 }
 return false;
}
function afterExposure(s,player,meld){
 if(meld.closed)return;
 const rank=meld.kind==='set'?meld.rank:null;
 if(meld.kind==='set'&&meld.owner===player&&meld.cards.length>=3){
  const targets=s.melds.filter(m=>!m.closed&&m.kind==='run'&&m.owner!==player&&m.cards.some(c=>(c.as?.rank||c.rank)===rank)&&!m.stalkedUntilTurn&&!s.melds.some(x=>x.owner===m.owner&&x.stalkedUntilTurn));
  if(targets.length){s.pendingEffect={type:'stalk',actor:player,rank,partyId:meld.id,targetIds:targets.map(m=>m.id)};return;}
 }
 if(meld.kind==='run'&&meld.cards.some(c=>s.melds.some(m=>!m.closed&&m.owner!==player&&m.kind==='set'&&m.rank===(c.as?.rank||c.rank)))){
  const cleanable=s.melds.some(m=>m.owner===player&&m.kind==='run'&&m.stalkedUntilTurn);
  s.pendingEffect={type:'diversion',actor:player,cleanable};
 }
}
function applyDiscardSpirit(s,player,discarded){
 const before=s.roles[player],jokers=discarded.filter(c=>c.joker),families=discarded.filter(c=>!c.joker).map(c=>family(c,s.options)),sameFamily=!!families.length&&!!families[0]&&families.every(value=>value===families[0]);let next=before;
 if(!discarded.length)return false;
 if(jokers.length){const companionFamily=families[0];next=before?otherRole(before):companionFamily?otherRole(companionFamily):'hunt';}
 else if(discarded.length===1){next=families[0]?otherRole(families[0]):before;}
 else if(sameFamily)next=otherRole(families[0]);
 if(next!==before){s.roles[player]=next;s.log.push(`${s.names[player]} ${before?'changed':'chose'} their spirit to ${next==='hunt'?'Hunt':'Escape'}.`);}
 return jokers.length>0&&before==='hunt'&&next==='escape';
}
function finishTurn(s,player){
 s.meldedThisTurn=false;s.pendingEffect=null;s.pendingTurnEnd=false;s.drawState=null;s.discardPicked=false;s.hurryDraw||=s.names.map(()=>0);s.hurryDraw[player]=0;s.turn=(s.turn+1)%s.names.length;s.turns++;s.stage=s.turns<s.names.length?'first-discard':'draw';s.discardSurges||=s.names.map(()=>0);s.discardRequired=Math.min(7,2+(s.discardSurges[s.turn]||0));s.discardSurges[s.turn]=0;s.skipDiscard=false;for(const meld of s.melds)if(meld.stalkedUntilTurn&&s.turns>=meld.stalkedUntilTurn){delete meld.stalkedUntilTurn;delete meld.stalkedFrom;}s.turnStarted=Date.now();
 if(qualifies(s,player))scoreState(s,player);
}

function replenishStock(s,count,random){
 if(s.stock.length>=count)return true;
 const recycled=(s.discardPiles||[]).flatMap(pile=>pile.slice(0,-1));for(const card of recycled){delete card.protected;delete card.protectedByEffect;delete card.protectedByExposure;delete card.discardEffect;delete card.discardEffectUntilTurn;}
 s.stock.push(...recycled);s.discardPiles=(s.discardPiles||[[],[]]).map(pile=>pile.length?[pile.at(-1)]:[]);
 for(let i=s.stock.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[s.stock[i],s.stock[j]]=[s.stock[j],s.stock[i]];}
 return s.stock.length>=count;
}
function addDiscard(s,pileIndex,card,suppressHurry=false){
 delete card.pendingDiscard;delete card.discardEffect;delete card.discardEffectUntilTurn;
 if(!card.joker){const effect=card.rank===10&&suppressHurry?null:{10:'Hurry',11:'Blaze',12:'Quench',13:'Evoke'}[card.rank];if(effect){card.discardEffect=effect;card.discardEffectUntilTurn=s.turns+2;}}
 if(card.joker||[10,12,13].includes(card.rank)){card.protected=true;card.protectedByEffect=true;}
 s.discardPiles[pileIndex].push(card);
}
function resetPileProtection(s){for(const pile of s.discardPiles||[])for(const card of pile){delete card.protected;delete card.protectedByEffect;delete card.protectedByExposure;}}
function keepProtectingCardsOnTop(s){for(const pile of s.discardPiles||[]){const index=pile.findLastIndex(card=>card.protectedByEffect);if(index>=0&&index<pile.length-1)pile.push(...pile.splice(index,1));}}
function cleanseEffect(card,{suppressHurry=false,suppressArise=false}={}){
 if(card.joker)return 'Spirit';if(card.rank===1&&!suppressArise)return 'Arise';return card.rank===10&&suppressHurry?null:{10:'Hurry',11:'Blaze',12:'Quench',13:'Evoke'}[card.rank]||null;
}
function recordCleanseIndicator(s,player,card,pileIndex,options={}){
 const effect=cleanseEffect(card,options);if(!effect)return;
 const scope=['Arise','Blaze','Evoke','Spirit'].includes(effect)?'self':'next';
 s.cleanseIndicators[pileIndex].push({cardId:card.id,effect,scope,player});
}
function returnAriseAce(card,hand,pileIndex){
 card.effectGlow='arise';card.effectGlowUntil=Math.max(Date.now()+2200,(Number(card.effectGlowUntil)||0)+1);card.effectGlowPile=pileIndex;hand.push(card);
}
function publishAriseEvent(s,player,cards){const arisen=cards.filter(card=>card.effectGlow==='arise');if(arisen.length)s.ariseEvent={sequence:(s.ariseEvent?.sequence||0)+1,player,cards:structuredClone(arisen)};}
function commitDiscard(s,player,entries,random,suppressHurry,fail){
 const hand=s.hands[player],cards=entries.map(entry=>entry.card),discardedIds=new Set(cards.map(card=>card.id)),remaining=hand.filter(card=>!discardedIds.has(card.id)),returnedAces=cards.some(card=>card.rank===1&&!card.joker);
 if(!remaining.length&&!returnedAces&&s.stock.length===0)fail('Keep cards in hand while the draw pool is empty.');
 applyDiscardSpirit(s,player,cards);s.cleanseIndicators=[[],[]];resetPileProtection(s);const mandatoryQuench=(s.discardRequired||2)>2;
 for(const entry of entries){let card=entry.card;if(entry.staged){const pile=s.discardPiles[entry.pileIndex]||[],index=pile.findIndex(discard=>discard.id===card.id);if(index<0)throw new Error('A staged discard is missing from its pile.');card=pile.splice(index,1)[0];delete card.pendingDiscard;}else hand.splice(hand.findIndex(item=>item.id===card.id),1);
  recordCleanseIndicator(s,player,card,entry.pileIndex,{suppressHurry,suppressArise:mandatoryQuench});
  if(card.rank===1&&!card.joker&&!mandatoryQuench){returnAriseAce(card,hand,entry.pileIndex);s.log.push(`${s.names[player]}’s Arise returned the Ace to hand.`);}else addDiscard(s,entry.pileIndex,card,suppressHurry);
 }
 s.pendingDiscard=null;s.discardPicked=false;s.skipDiscard=false;s.log.push(cards.length?`${s.names[player]} discarded ${cards.length} card${cards.length===1?'':'s'}.`:`${s.names[player]} ended the turn without discarding.`);
 keepProtectingCardsOnTop(s);publishAriseEvent(s,player,hand.filter(card=>discardedIds.has(card.id)&&card.effectGlow==='arise'));const effect=applyDiscardEffects(s,player,cards,random,true,suppressHurry);if(effect.shouldEndTurn&&!effect.pending)finishTurn(s,player);return s;
}
function drawFromStock(s,count,random){if(!replenishStock(s,count,random))return [];return Array.from({length:count},()=>s.stock.pop());}
function applyDiscardEffects(s,player,cards,random,endsTurn=true,suppressHurry=false){
 const next=(player+1)%s.names.length,blazes=cards.some(card=>!card.joker&&card.rank===11),quenches=cards.filter(card=>!card.joker&&card.rank===12).length,hurries=suppressHurry?0:cards.filter(card=>!card.joker&&card.rank===10).length,evokes=cards.filter(card=>!card.joker&&card.rank===13).length,shouldEndTurn=endsTurn||blazes;
 s.discardSurges||=s.names.map(()=>0);s.hurryDraw||=s.names.map(()=>0);
 if(quenches){s.quenchCount=(s.quenchCount||0)+quenches;s.discardSurges[next]=s.quenchCount;s.log.push(`${s.names[player]}’s Quench makes ${s.names[next]} discard ${Math.min(7,2+s.quenchCount)} cards next turn (${s.quenchCount} Q${s.quenchCount===1?'':'s'} discarded this game).`);}
 if(hurries){s.hurryDraw[next]=hurries;const reduced=Math.min(2,hurries);s.log.push(`${s.names[player]}’s Hurry (${hurries} H${hurries===1?'':'s'} discarded together) reduces ${s.names[next]}’s next draw by ${reduced}, to ${2-reduced} card${2-reduced===1?'':'s'}.`);}
 if(blazes){const drawn=drawFromStock(s,1,random);s.hands[player].push(...drawn);s.log.push(drawn.length?`${s.names[player]}’s Blaze drew one card; their turn ends immediately.`:`${s.names[player]}’s Blaze found no card in the pool; their turn ends immediately.`);}
 if(evokes){const available=s.melds.filter(m=>m.kind==='set'&&!m.closed).length;if(available){s.pendingEffect={type:'evoke',actor:player,remaining:Math.min(evokes,available)};s.pendingTurnEnd=shouldEndTurn;s.log.push(`${s.names[player]}’s Evoke can close ${s.pendingEffect.remaining} Pack${s.pendingEffect.remaining===1?'':'s'}.`);return {pending:true,shouldEndTurn};}s.log.push(`${s.names[player]}’s Evoke found no face-up Pack.`);}
 return {pending:false,shouldEndTurn};
}

export function playHuntEscape(state,player,action,{PlayerError,play,fieldAction},random=Math.random){
 const s=structuredClone(state),fail=message=>{throw new PlayerError(message);},hand=s.hands[player],rules=s.options;
 if(s.winner!==null)fail('The round has ended.');if(player!==s.turn)fail('It is not your turn.');
 const find=ids=>{if(!Array.isArray(ids)||new Set(ids).size!==ids.length)fail('Choose each card once.');const cards=ids.map(id=>hand.find(c=>c.id===id));if(cards.some(c=>!c))fail('Choose cards from your hand.');return cards;};
 const resolve=(cards,opening=false,role=s.roles[player])=>resolveHuntEscapeMeld(cards,{role,rules:{...rules,opening:0}}),discardKeep=s.skipDiscard?0:(s.discardRequired||2);
 const isFirstTurnDiscard=action.type==='discard'||action.type==='stage-discard'||action.type==='field-play'&&action.move?.type==='discard';
 if(s.stage==='first-discard'&&!isFirstTurnDiscard&&!(action.type==='evoke'&&s.pendingEffect?.type==='evoke'))fail('The first turn is for discarding cards to choose your spirit.');
 if(s.pendingEffect){
  if(action.type==='evoke'&&s.pendingEffect.type==='evoke'){
   const target=s.melds.find(m=>m.id===action.meldId&&m.kind==='set'&&!m.closed);if(!target)fail('Choose a face-up Pack to close.');target.closed=true;
   for(const meld of s.melds)if(meld.stalkedFrom===target.id){delete meld.stalkedUntilTurn;delete meld.stalkedFrom;}
   s.pendingEffect.remaining--;s.log.push(`${s.names[player]} used Evoke to close ${s.names[target.owner]}’s Pack; its Stalks fade and it no longer counts for Hunt victory.`);
   const morePacks=s.melds.some(m=>m.kind==='set'&&!m.closed);if(s.pendingEffect.remaining>0&&morePacks)return s;
   const endsTurn=s.pendingTurnEnd;s.pendingEffect=null;s.pendingTurnEnd=false;if(endsTurn)finishTurn(s,player);return s;
  }
  if(action.type==='evoke-pass'&&s.pendingEffect.type==='evoke'&&!s.melds.some(m=>m.kind==='set'&&!m.closed)){
   s.log.push(`${s.names[player]} had no face-up Pack left to close with Evoke.`);const endsTurn=s.pendingTurnEnd;s.pendingEffect=null;s.pendingTurnEnd=false;if(endsTurn)finishTurn(s,player);return s;
  }
  if(action.type==='stalk'){
   if(s.pendingEffect.type!=='stalk'||!s.pendingEffect.targetIds.includes(action.meldId))fail('Choose one of the available prey runs to Stalk.');const target=s.melds.find(m=>m.id===action.meldId);if(!target)fail('That run is no longer available.');const distance=(target.owner-player+s.names.length)%s.names.length;target.stalkedUntilTurn=s.turns+distance+1;target.stalkedFrom=s.pendingEffect.partyId;s.stalkTracks||=s.names.map(()=>0);s.stalkTracks[player]=(s.stalkTracks[player]||0)+1;s.log.push(`${s.names[target.owner]}’s ${target.suit} path is Stalked through their next turn.`);s.pendingEffect=null;return s;
  }
  if(action.type==='stalk-pass'&&s.pendingEffect.type==='stalk'){s.pendingEffect=null;return s;}
  if(action.type==='diversion'){
   if(s.pendingEffect.type!=='diversion'||!['clear','draw'].includes(action.choice))fail('Choose a Diversion.');
   if(action.choice==='clear'){
    const target=s.melds.find(m=>m.id===action.meldId&&m.owner===player&&m.kind==='run'&&m.stalkedUntilTurn);if(!target)fail('Choose one of your Stalked runs.');delete target.stalkedUntilTurn;delete target.stalkedFrom;s.pendingEffect=null;s.log.push(`${s.names[player]} cleared Stalk from a run.`);
   }else{if(s.stock.length<2)fail('There are not two cards left for a Diversion.');hand.push(s.stock.pop(),s.stock.pop());s.bonusDiscard=1;s.pendingEffect=null;s.log.push(`${s.names[player]} took a two-card Diversion and must discard one card.`);}
   return s;
  }
  fail('Resolve the current special effect first.');
 }
 if(s.pendingDiscard&&s.pendingDiscard.player!==player)fail('Another player is still completing a discard.');if(s.pendingDiscard&&action.type!=='discard'&&action.type!=='stage-discard'&&!(action.type==='field-play'&&action.move?.type==='discard'))fail('Complete your pending discard first.');
 if(s.bonusDiscard&&action.type!=='bonus-discard')fail('Discard the two Diversion cards before continuing.');
 if(action.type?.startsWith('field-'))return fieldAction(s,player,action,{play,resolveMeld:(cards,opts)=>resolve(cards,opts?.opening),PlayerError},random);
 if(action.type==='draw'){
  if(s.stage!=='draw')fail('The first turn is for discarding, with no draw.');const secondTurn=s.turns>=s.names.length&&s.turns<s.names.length*2,hurries=hurryCount(s,player),hurry=hurries>0,pile=action.source;if(hurry&&drawTarget(s,player)===0)fail('Your Hurry leaves no cards to draw this turn.');
  if(!s.drawState)s.drawState={player,target:drawTarget(s,player),drawn:0,piles:[],secondTurn};const drawing=s.drawState;if(drawing.player!==player)fail('This draw belongs to another player.');const remaining=Math.max(0,drawing.target-drawing.drawn);if(remaining===0)fail('Your draw is already complete.');
  if(pile==='stock'){
   if(!replenishStock(s,remaining,random))fail('The draw pool is empty.');hand.push(...Array.from({length:remaining},()=>s.stock.pop()));drawing.drawn+=remaining;s.log.push(`${s.names[player]} drew ${remaining} card${remaining===1?'':'s'}${hurry?' for Hurry':''}.`);
  }else if(pile==='discard-0'||pile==='discard-1'){
   if(!s.opened[player]&&!drawing.secondTurn&&!hurry)fail('You can pick a discard only after exposing your first meld.');const index=Number(pile.at(-1)),stack=s.discardPiles[index],candidate=stack?.at(-1);if(!candidate)fail('That discard pile is empty.');if(candidate.protected)fail(candidate.rank===10?'The H card is protected by Hurry and cannot be picked up.':'That card is protected and cannot be picked up.');if(drawing.piles.includes(index))fail('You have already taken from that discard pile this turn.');
   const top=stack.pop();delete top.protected;delete top.protectedByEffect;delete top.protectedByExposure;delete top.discardEffect;delete top.discardEffectUntilTurn;hand.push(top);drawing.piles.push(index);drawing.drawn++;
   const newlyExposed=stack.at(-1);if(newlyExposed){newlyExposed.protected=true;newlyExposed.protectedByExposure=true;}
   s.discardPicked=true;s.log.push(`${s.names[player]} picked a discard${hurry?' for Hurry':''}.`);
   if(drawing.secondTurn){drawing.target=1;drawing.drawn=1;}
  }else fail('Choose a draw pile.');
  if(drawing.drawn>=drawing.target){s.skipDiscard=hand.length<(s.discardRequired||2);s.stage='meld';s.meldedThisTurn=false;s.discardPicked=false;s.drawState=null;s.bonusDiscard=0;}return s;
 }
 if(action.type==='skip-hurry-draw'){
  if(s.stage!=='draw'||hurryCount(s,player)<2||s.drawState?.drawn)fail('You may skip drawing only when Hurry reduces your draw to zero.');s.drawState=null;s.skipDiscard=hand.length<(s.discardRequired||2);s.stage='meld';s.meldedThisTurn=false;s.discardPicked=false;s.log.push(`${s.names[player]}’s Hurry reduced their draw to zero; they continue without drawing.`);return s;
 }
 if(action.type==='stage-discard'){
  if(s.pendingEffect||s.bonusDiscard)fail('Resolve the special move before discarding.');if(s.stage!=='meld'&&s.stage!=='first-discard')fail('You cannot discard at this point in the turn.');const required=s.skipDiscard?0:(s.discardRequired||2),cards=find(action.ids);if(required===0)fail('No discard is required this turn.');if(!cards.length)fail('Choose cards to discard.');const pending=s.pendingDiscard||{player,ids:[],piles:[]};if(pending.ids.length+cards.length>required)fail(`Discard exactly ${required} cards this turn.`);if(s.fieldGroups?.length)s.fieldGroups=[];const firstPile=Number(action.pileIndex)===1?1:0;
  for(let i=0;i<cards.length;i++){const card=cards[i],pileIndex=(firstPile+i)%2;hand.splice(hand.findIndex(item=>item.id===card.id),1);s.discardPiles[pileIndex].push({...card,pendingDiscard:true});pending.ids.push(card.id);pending.piles.push(pileIndex);}
  s.pendingDiscard=pending;const needed=required-pending.ids.length;if(needed>0){s.log.push(`${s.names[player]} placed ${cards.length} card${cards.length===1?'':'s'} in the discard pile; ${needed} more to complete the discard.`);return s;}
  const entries=pending.ids.map((id,index)=>({card:s.discardPiles[pending.piles[index]].find(card=>card.id===id),pileIndex:pending.piles[index],staged:true}));if(entries.some(entry=>!entry.card))fail('A staged discard is missing from its pile.');return commitDiscard(s,player,entries,random,s.stage==='first-discard',fail);
 }
 if(s.stage!=='meld'&&s.stage!=='first-discard')fail('Draw before melding.');
 if(action.type==='open'||action.type==='meld'){
  if(!s.roles[player])fail('Choose your Hunt or Escape spirit with a same-family discard before melding.');if(s.meldedThisTurn)fail('You may meld only once per turn.');if(s.opened[player]&&action.type==='open')fail('You have already exposed a meld.');
  const groups=action.groups||[action.ids],ids=groups.flat(),cards=find(ids);if(groups.length!==1)fail('Expose only one meld on your turn.');if(ids.length!==new Set(ids).size||hand.length-ids.length<discardKeep)fail(`Keep ${discardKeep} card${discardKeep===1?'':'s'} for your discard.`);const choices=groups.map(group=>resolve(find(group),false));if(choices.some(m=>!m))fail(`Only ${s.roles[player]==='hunt'?'Hunter sets':'Prey runs'} may be exposed while following this path.`);
  const additions=choices.map((meld,i)=>({...meld,id:`he-${s.turns}-${s.melds.length+i}-${ids[i]}`,owner:player,stalkedUntilTurn:null}));s.melds.push(...additions);for(const c of cards)hand.splice(hand.findIndex(x=>x.id===c.id),1);s.opened[player]=true;s.meldedThisTurn=true;s.log.push(`${s.names[player]} exposed ${additions.length===1?'a meld':additions.length+' melds'}.`);for(const m of additions)afterExposure(s,player,m);if(!s.pendingEffect&&qualifies(s,player))scoreState(s,player);return s;
 }
 if(action.type==='layoff'){
  if(!s.roles[player])fail('Choose your Hunt or Escape spirit before melding.');if(s.meldedThisTurn)fail('You may meld only once per turn.');const old=s.melds[action.index],cards=find(action.ids),ownerCanAdd=old&&!old.closed&&(old.kind==='set'?s.roles[player]==='hunt':s.roles[player]==='escape'&&old.owner===player),oldSize=old?.cards.length,merged=old&&resolve([...old.cards,...cards],false);if(!s.opened[player]||!old||!ownerCanAdd||old.stalkedUntilTurn&&s.turns<old.stalkedUntilTurn||!merged||hand.length-cards.length<discardKeep)fail('Hunt can add to any face-up Party; Escape can add only to your own Path.');old.cards=merged.cards;for(const c of cards)hand.splice(hand.findIndex(x=>x.id===c.id),1);s.meldedThisTurn=true;s.log.push(`${s.names[player]} extended a ${old.kind==='set'?'Party':'Path'}.`);if(old.kind==='set'&&old.owner===player&&oldSize<merged.cards.length)afterExposure(s,player,old);if(old.kind==='run'&&old.owner===player)afterExposure(s,player,old);if(!s.pendingEffect&&qualifies(s,player))scoreState(s,player);return s;
 }
 if(action.type==='bonus-discard'){
  if(s.bonusDiscard!==1)fail('There is no Diversion discard pending.');const cards=find(action.ids);if(cards.length!==1)fail('Choose one card to discard for the Diversion.');applyDiscardSpirit(s,player,cards);s.cleanseIndicators=[[],[]];resetPileProtection(s);recordCleanseIndicator(s,player,cards[0],0);hand.splice(hand.findIndex(c=>c.id===cards[0].id),1);if(cards[0].rank===1&&!cards[0].joker){returnAriseAce(cards[0],hand,0);s.log.push(`${s.names[player]}’s Arise returned the Ace to hand.`);}else addDiscard(s,0,cards[0]);publishAriseEvent(s,player,hand.filter(card=>card.id===cards[0].id&&card.effectGlow==='arise'));s.bonusDiscard=0;s.log.push(`${s.names[player]} discarded one card for the Diversion.`);const effect=applyDiscardEffects(s,player,cards,random,false);if(effect.shouldEndTurn&&!effect.pending)finishTurn(s,player);return s;
 }
 if(action.type==='discard'){
  if(s.pendingEffect||s.bonusDiscard)fail('Resolve the special move before ending your turn.');const newCards=find(action.ids),required=s.skipDiscard?0:(s.discardRequired||2),pending=s.pendingDiscard?.player===player?s.pendingDiscard:{ids:[],piles:[]};if(pending.ids.length+newCards.length!==required)fail(required?`Choose ${Math.max(0,required-pending.ids.length)} more cards to discard.`:'No discard is required this turn.');if(s.fieldGroups?.length)s.fieldGroups=[];const entries=pending.ids.map((id,index)=>({card:s.discardPiles[pending.piles[index]]?.find(card=>card.id===id),pileIndex:pending.piles[index],staged:true}));let nextPile=pending.piles.length?1-pending.piles.at(-1):0;for(let i=0;i<newCards.length;i++)entries.push({card:newCards[i],pileIndex:(nextPile+i)%2,staged:false});if(entries.some(entry=>!entry.card))fail('A staged discard is missing from its pile.');return commitDiscard(s,player,entries,random,s.stage==='first-discard',fail);
 }
 fail('Unknown Sylvan Trail action.');
}

export function huntEscapeBotAction(s){
 const p=s.turn,hand=s.hands[p];
 if(s.pendingEffect?.type==='evoke'){const pack=s.melds.find(m=>m.kind==='set'&&!m.closed);return pack?{type:'evoke',meldId:pack.id}:{type:'evoke-pass'};}
 if(s.stage==='first-discard'){
  const count=s.discardRequired||2,hunter=discardCandidates(hand.filter(c=>s.options.hunterSuits.includes(c.suit)),s),prey=discardCandidates(hand.filter(c=>s.options.preySuits.includes(c.suit)),s),familyCards=hunter.length>=count?hunter:prey.length>=count?prey:discardCandidates(hand,s);return {type:'discard',ids:familyCards.slice(0,count).map(c=>c.id)};
 }
 if(s.pendingEffect?.type==='stalk')return s.pendingEffect.targetIds.length?{type:'stalk',meldId:s.pendingEffect.targetIds[0]}:{type:'stalk-pass'};
 if(s.pendingEffect?.type==='diversion'){const target=s.melds.find(m=>m.owner===p&&m.stalkedUntilTurn);return target?{type:'diversion',choice:'clear',meldId:target.id}:{type:'diversion',choice:'draw'};}
 if(s.bonusDiscard)return {type:'bonus-discard',ids:discardCandidates(hand,s).slice(0,1).map(c=>c.id)};
 if(s.stage==='draw'){const hurries=hurryCount(s,p);if(hurries>=2)return {type:'skip-hurry-draw'};if(hurries){const pile=(s.discardPiles||[]).findIndex(stack=>stack?.at(-1)&&!stack.at(-1).protected);if(pile>=0)return {type:'draw',source:`discard-${pile}`};}return {type:'draw',source:'stock'};}
 if(!s.meldedThisTurn&&s.roles[p]){const role=s.roles[p],candidates=[],keep=s.skipDiscard?0:(s.discardRequired||2);
  for(let rank=1;rank<=13;rank++){const cards=hand.filter(c=>s.options.hunterSuits.includes(c.suit)&&c.rank===rank);for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++)candidates.push([cards[i],cards[j]]);}
  for(const suit of s.options.preySuits)for(let start=1;start<=11;start++){const group=Array.from({length:3},(_,i)=>hand.find(c=>c.suit===suit&&c.rank===start+i));if(group.every(Boolean))candidates.push(group);}
  for(const cards of candidates){if(hand.length-cards.length>=keep&&resolveHuntEscapeMeld(cards,{role,rules:s.options}))return {type:'meld',ids:cards.map(c=>c.id)};}
 }
 if(!s.roles[p]){const hunter=discardCandidates(hand.filter(c=>s.options.hunterSuits.includes(c.suit)),s),prey=discardCandidates(hand.filter(c=>s.options.preySuits.includes(c.suit)),s),familyCards=hunter.length>=2?hunter:prey.length>=2?prey:discardCandidates(hand,s);return {type:'discard',ids:familyCards.slice(0,2).map(c=>c.id)};}
 const count=s.skipDiscard?0:(s.discardRequired||2);return {type:'discard',ids:discardCandidates(hand,s).slice(0,count).map(c=>c.id)};
}
function discardCandidates(hand,s){return [...hand].sort((a,b)=>{const need=c=>hand.reduce((n,o)=>n+(o.id!==c.id&&o.suit===c.suit&&Math.abs(o.rank-c.rank)<=2?1:0)+(o.id!==c.id&&o.rank===c.rank?1:0),0);return need(a)-need(b)||b.rank-a.rank;});}
