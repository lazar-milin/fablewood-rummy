// Rummikub keeps a committed table plus an editable, public turn workspace.
// Workspace IDs are references: rack tiles remain private-owned until commit.
const suits=['fox','hare','toad','owl'];
export const RUMMIKUB_RULES={variant:'rummikub',handSize:14,opening:30,aceMode:'low',jokerEnds:true,handEnabled:false,cutEnabled:false,dealDuplicateLimit:0,redealDuplicateLimit:0};
export const rummikubRules=(options={})=>({...options,...RUMMIKUB_RULES,handSize:options.handSize??14,opening:options.opening??30});
export function resolveRummikub(cards){
 if(!Array.isArray(cards)||cards.length<3||cards.length>13||new Set(cards.map(c=>c.id)).size!==cards.length)return null;
 const real=cards.filter(c=>!c.joker),wild=cards.filter(c=>c.joker);if(!real.length||real.some(c=>!suits.includes(c.suit)||!Number.isInteger(c.rank)||c.rank<1||c.rank>13))return null;
 if(cards.length<=4&&new Set(real.map(c=>c.rank)).size===1&&new Set(real.map(c=>c.suit)).size===real.length){const missing=suits.filter(s=>!real.some(c=>c.suit===s)),rank=real[0].rank,resolved=[...real,...wild.map((c,i)=>({...c,as:{suit:missing[i],rank}}))];return {kind:'set',cards:resolved,points:rank*cards.length};}
 if(new Set(real.map(c=>c.suit)).size!==1||new Set(real.map(c=>c.rank)).size!==real.length)return null;
 for(let start=1;start+cards.length-1<=13;start++){const range=Array.from({length:cards.length},(_,i)=>start+i);if(real.some(c=>!range.includes(c.rank)))continue;const missing=range.filter(n=>!real.some(c=>c.rank===n));const resolved=[...real,...wild.map((c,i)=>({...c,as:{suit:real[0].suit,rank:missing[i]}}))].sort((a,b)=>(a.as?.rank||a.rank)-(b.as?.rank||b.rank));return {kind:'run',cards:resolved,points:range.reduce((a,b)=>a+b,0)};}return null;
}
export function rummikubCards(s){return new Map([...s.melds.flatMap(g=>g.cards),...s.hands.flat()].map(c=>[c.id,c]));}
export function resetRummikubTable(s){s.fieldGroups=s.melds.map(m=>({owner:s.opened[s.turn]?s.turn:-1,ids:m.cards.map(c=>c.id)}));}
export function createRummikub(names,options,random,PlayerError){
 options=rummikubRules(options);if(!Number.isInteger(options.handSize)||options.handSize<7||options.handSize>14||![30,31].includes(options.opening))throw new PlayerError('Choose 7–14 starting kubs and an opening of 30 or 31.');
 if(names.length<2||names.length>6)throw new PlayerError('Rummikub supports two to six players.');
 const expanded=names.length>=5;
 const stock=Array.from({length:expanded?3:2},(_,copy)=>suits.flatMap(suit=>Array.from({length:13},(_,i)=>({id:`${copy}-${suit}-${i+1}`,suit,rank:i+1})))).flat();stock.push(...Array.from({length:expanded?4:2},(_,i)=>i).map(i=>({id:'joker-'+i,suit:'joker',rank:0,joker:true})));
 for(let i=stock.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[stock[i],stock[j]]=[stock[j],stock[i]];}
 const first=options.first??0,s={names,hands:names.map(()=>stock.splice(0,options.handSize)),stock,cutCard:null,discard:[],melds:[],fieldGroups:[],openingAttempt:[],turn:first,first,stage:'meld',turns:0,opened:names.map(()=>false),winner:null,scores:names.map(()=>0),turnStarted:Date.now(),options,mustOpen:false,mustHand:false,pendingJokers:[],fieldNotice:null,rkPasses:0,log:[`Rummikub: play ${options.opening} points from your rack to open. Draw one to end a turn without playing.`]};return s;
}
export function playRummikub(state,player,a,{PlayerError,candidateMelds},random){
 const s=structuredClone(state),fail=m=>{throw new PlayerError(m);};s.fieldNotice=null;if(s.winner!==null)fail('The round has ended.');if(player!==s.turn)fail('It is not your turn.');
 const map=rummikubCards(s),hand=s.hands[player],tableIds=new Set(s.melds.flatMap(g=>g.cards.map(c=>c.id))),used=()=>new Set(s.fieldGroups.flatMap(g=>g.ids));
 const group=i=>{if(!Number.isInteger(i)||!s.fieldGroups[i]||s.fieldGroups[i].owner!==player)fail('Open first; existing table groups are locked until your next turn.');return s.fieldGroups[i];};
 const pick=ids=>{if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!hand.some(c=>c.id===id)||used().has(id)))fail('Choose unused tiles from your rack.');return [...ids];};
 const remove=i=>{const g=group(i);s.fieldGroups.splice(i,1);return g.ids;};
 const result=g=>resolveRummikub(g.ids.map(id=>map.get(id)));
 const scores=winner=>{const sums=s.hands.map(h=>h.reduce((n,c)=>n+(c.joker?30:c.rank),0)),base=sums[winner];s.scores=sums.map((n,i)=>i===winner?0:Math.max(0,n-base));s.scores[winner]=-s.scores.reduce((a,b)=>a+b,0);s.winner=winner;s.log.push(s.names[winner]+' emptied the rack or won the blocked pool.');};
 const next=()=>{s.turn=(s.turn+1)%s.names.length;s.turns++;s.turnStarted=Date.now();resetRummikubTable(s);return s;};
 const draw=(count=1)=>{const hadStock=!!s.stock.length;resetRummikubTable(s);for(let i=0;i<count&&s.stock.length;i++)hand.push(s.stock.pop());s.rkPasses=hadStock?0:s.rkPasses+1;s.log.push(s.names[player]+(count===3?' restored the table and drew up to three penalty tiles.':' drew one tile (or passed with an empty pool).'));if(!s.stock.length&&s.rkPasses>=s.names.length){const values=s.hands.map(h=>h.reduce((n,c)=>n+(c.joker?30:c.rank),0));scores(values.indexOf(Math.min(...values)));return s;}return next();};
 const commit=()=>{const ids=s.fieldGroups.flatMap(g=>g.ids),seen=new Set(ids);if(ids.length!==seen.size||[...tableIds].some(id=>!seen.has(id)))fail('Every table tile must stay on the table, exactly once.');const resolved=s.fieldGroups.map(result);if(resolved.some(m=>!m))fail('Complete every group or reset your turn. All groups need at least three legal tiles.');const added=ids.filter(id=>!tableIds.has(id));if(!added.length)fail('Play at least one tile from your rack, or draw to end your turn.');if(!s.opened[player]){const newGroups=s.fieldGroups.filter(g=>g.owner===player),total=newGroups.reduce((n,g)=>n+result(g).points,0);if(total<s.options.opening)fail(`Your opening must total at least ${s.options.opening} points from your rack.`);s.opened[player]=true;}
 s.hands[player]=hand.filter(c=>!added.includes(c.id));s.melds=resolved.map(m=>({...m,owner:player}));s.rkPasses=0;s.log.push(s.names[player]+' played '+added.length+' tile(s).');if(!s.hands[player].length){scores(player);resetRummikubTable(s);return s;}return next();};
 if(a.type==='draw'){if(a.source&&a.source!=='stock')fail('There is no discard or cut card in Rummikub.');return draw();}
 if(a.type==='rk-penalty')return draw(3);
 if(a.type==='rk-end')return commit();
 if(a.type==='rk-reset'){resetRummikubTable(s);return s;}
 if(a.type==='rk-auto'){
  resetRummikubTable(s);const candidates=candidateMelds(hand,s.options,false);let chosen=null,nodes=0;
  function search(start,ids,groups,total){if(++nodes>12000||chosen)return;if(groups.length&&(s.opened[player]||total>=s.options.opening)){chosen=groups;return;}for(let i=start;i<candidates.length;i++){const m=candidates[i];if(m.ids.some(id=>ids.has(id)))continue;search(i+1,new Set([...ids,...m.ids]),[...groups,m],total+m.points);}}
  search(0,new Set(),[],0);if(chosen){s.fieldGroups.push(...chosen.map(m=>({owner:player,ids:m.ids})));return commit();}
  if(s.opened[player])for(const g of s.fieldGroups)for(const c of hand)if(resolveRummikub([...g.ids.map(id=>map.get(id)),c])){g.ids.push(c.id);return commit();}
  return draw();
 }
 if(a.type==='field-stage'){const ids=pick(a.ids),at=Number.isInteger(a.before)?Math.max(0,Math.min(s.fieldGroups.length,a.before)):s.fieldGroups.length;s.fieldGroups.splice(at,0,{owner:player,ids});}
 else if(a.type==='field-merge'){const target=group(a.index);if(a.source===a.index)return s;const ids=a.source===undefined?pick(a.ids):remove(a.source),at=Number.isInteger(a.position)?Math.max(0,Math.min(target.ids.length,a.position)):target.ids.length;target.ids.splice(at,0,...ids);}
 else if(a.type==='field-group'){if(!Array.isArray(a.indices)||a.indices.length<2||new Set(a.indices).size!==a.indices.length)fail('Choose different groups.');const chosen=a.indices.map(group),at=Math.min(...a.indices);s.fieldGroups=s.fieldGroups.filter(g=>!chosen.includes(g));s.fieldGroups.splice(at,0,{owner:player,ids:chosen.flatMap(g=>g.ids)});}
 else if(a.type==='field-eject'){const g=group(a.index);if(!g.ids.includes(a.id))fail('Choose a tile in the group.');g.ids=g.ids.filter(id=>id!==a.id);if(!g.ids.length)s.fieldGroups.splice(a.index,1);if(tableIds.has(a.id))s.fieldGroups.push({owner:player,ids:[a.id]});}
 else if(a.type==='field-return'){if(a.index===undefined){resetRummikubTable(s);return s;}const g=group(a.index);if(g.ids.some(id=>tableIds.has(id)))fail('Table tiles cannot return to a rack. Use Split group or Reset turn.');remove(a.index);}
 else if(a.type==='rk-split'){const ids=remove(a.index);s.fieldGroups.push(...ids.map(id=>({owner:player,ids:[id]})));}
 else if(a.type==='field-reorder'){const g=group(a.index);s.fieldGroups.splice(a.index,1);const before=Number.isInteger(a.before)?a.before:s.fieldGroups.length+1;s.fieldGroups.splice(Math.max(0,before-(a.index<before?1:0)),0,g);}
 else fail('Choose a Rummikub action.');return s;
}
