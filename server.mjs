import {RUMMIKUB_RULES,rummikubRules,rummikubCards} from './public/rummikub.js';
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {createCipheriv,createDecipheriv,createHash,randomBytes,randomInt} from 'node:crypto';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {gzip} from 'node:zlib';
import {createGame,play,botAction,botDiscard,DEFAULT_RULES,PlayerError,resolveMeld} from './public/engine.js';
import {forestName} from './public/names.js';
import {rateLimiter,expireTables} from './limits.mjs';
import {createBotScheduler} from './bot-scheduler.mjs';
import {duplicatePairs,dealReview} from './public/duplicate-deals.js';
import {DEFAULT_WIN_RULES,awardRound,resetMatch} from './public/win-conditions.js';
import {describeMove} from './public/move-events.js';
const rooms=new Map(),resumeRooms=new Map(),address=process.env.HOST||(process.env.RENDER==='true'?'0.0.0.0':'127.0.0.1'),port=Number(process.env.PORT||3010),publicDir=fileURLToPath(new URL('./public/',import.meta.url));
// Only create adds a table, so it has a much smaller allowance than polling and moves.
const limiter=rateLimiter(1800,60000),creates=rateLimiter(20,60000),trustProxy=process.env.TRUST_PROXY==='true',gzipAsync=promisify(gzip),zipped=new Map();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.csv':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.ttf':'font/ttf','.woff2':'font/woff2'},compressible=new Set(['.html','.js','.css','.json','.svg']);
// Deals, reshuffles and generated names come from a cryptographic source, so earlier values can't predict the next deal.
const random=()=>randomInt(2**48-1)/(2**48-1);
// Behind one reverse proxy every request comes from the proxy, which appends the player's address to X-Forwarded-For.
const clientAddress=req=>trustProxy&&req.headers['x-forwarded-for']?req.headers['x-forwarded-for'].split(',').at(-1).trim():req.socket.remoteAddress;
const token=()=>randomBytes(16).toString('hex');
const resumeKey=process.env.TABLE_RESUME_SECRET?createHash('sha256').update(process.env.TABLE_RESUME_SECRET).digest():randomBytes(32);
function sealResume(payload){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',resumeKey,iv),encrypted=Buffer.concat([cipher.update(JSON.stringify(payload)),cipher.final()]);return `FWR1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;}
function openResume(code){try{if(typeof code!=='string'||code.length>22000)throw Error();const [version,ivText,tagText,dataText,...extra]=code.split('.');if(version!=='FWR1'||extra.length||!(/^[A-Za-z0-9_-]{16}$/.test(ivText||''))||!(/^[A-Za-z0-9_-]{22}$/.test(tagText||''))||!(/^[A-Za-z0-9_-]+$/.test(dataText||'')))throw Error();const decipher=createDecipheriv('aes-256-gcm',resumeKey,Buffer.from(ivText,'base64url'));decipher.setAuthTag(Buffer.from(tagText,'base64url'));const payload=JSON.parse(Buffer.concat([decipher.update(Buffer.from(dataText,'base64url')),decipher.final()]).toString('utf8'));const humanNames=payload?.players?.filter(player=>player?.type==='human').map(player=>player.name)||[];if(payload?.version!==1||!(/^[a-f0-9]{32}$/.test(payload.id||''))||!Array.isArray(payload.players)||payload.players.length<2||payload.players.length>6||new Set(humanNames).size!==humanNames.length||!payload.state||!Array.isArray(payload.state.hands)||payload.state.hands.length!==payload.players.length||!Array.isArray(payload.state.stock)||!Number.isInteger(payload.state.turn)||payload.state.turn<0||payload.state.turn>=payload.players.length||payload.state.winner!==null||!Array.isArray(payload.totals)||payload.totals.length!==payload.players.length||!payload.options||!['remi51','rummikub'].includes(payload.options.variant)||!Number.isInteger(payload.host)||payload.host<0||payload.host>=payload.players.length||payload.players.some((player,i)=>!player||typeof player.name!=='string'||!player.name||player.name.length>24||!['human','bot'].includes(player.type)||payload.state.names?.[i]!==player.name))throw Error();return payload;}catch{throw new PlayerError('That continuation code is invalid or incomplete.');}}
function continuationCode(r){if(r.mode!=='online'||r.phase!=='game'||!r.state||r.state.winner!==null||r.nextRoundAt||r.dealReview?.pending.length||r.resumePending||!r.turnStartState)throw new PlayerError('A continuation code is available during a live online turn.');const state=structuredClone(r.turnStartState),names=r.players.map((player,i)=>player.type==='human'?state.names[i]:null).filter(Boolean);if(new Set(names).size!==names.length)throw new PlayerError('Each human player needs a unique name before a continuation code can be made.');state.turnStarted=Date.now();return sealResume({version:1,id:randomBytes(16).toString('hex'),createdAt:Date.now(),host:r.host,players:r.players.map((player,i)=>({name:state.names[i],type:player.type})),options:{...r.options},state,totals:[...r.totals],scored:!!r.scored,completedGames:r.completedGames||0,roundResults:structuredClone(r.roundResults||[]),matchWinners:[...(r.matchWinners||[])],round:r.round||0,dealNumber:r.dealNumber||0});}
function notifyDeparture(r,leavingSeat){const recipients=r.players.map((player,i)=>i).filter(i=>i!==leavingSeat&&r.players[i].type==='human'&&r.players[i].token);if(!recipients.length)return;let snapshot=null;try{snapshot=continuationCode(r);}catch(error){if(!(error instanceof PlayerError))throw error;}r.notifications||=r.players.map(()=>[]);const name=r.state.names[leavingSeat]||r.players[leavingSeat].name,message=snapshot?`${name} left the table. Click to get a continuation code.`:`${name} left the table.`,turnName=r.turnStartState?.names?.[r.turnStartState.turn]||r.state.names[r.state.turn];for(const i of recipients)r.notifications[i].push({id:token(),message,expiresAt:Date.now()+10000,snapshot,turnName});}
function resumeTable(payload,name){const supplied=String(name??'').trim();if(!payload.players.some(player=>player.type==='human'&&player.name===supplied))throw new PlayerError(supplied?'No seat has that exact saved player name. Check the name used at the table.':'Enter your exact saved player name.');let r=rooms.get(resumeRooms.get(payload.id));if(!r){let tableCode;do{tableCode=randomBytes(4).toString('hex');}while(rooms.has(tableCode));const state=structuredClone(payload.state);state.turnStarted=Date.now();r={code:tableCode,host:payload.host,touched:Date.now(),players:payload.players.map(player=>({name:player.name,token:null,type:player.type})),mode:'online',phase:'game',options:payload.options,revision:0,state,turnStartState:structuredClone(state),history:[],turnBackup:null,totals:[...payload.totals],scored:payload.scored,completedGames:payload.completedGames,roundResults:payload.roundResults,matchWinners:payload.matchWinners,nextRoundAt:null,dealReview:null,moves:[],moveID:0,tinkering:false,round:payload.round,dealNumber:payload.dealNumber,resumePending:true,resumeId:payload.id};rooms.set(tableCode,r);resumeRooms.set(payload.id,tableCode);}const index=r.players.findIndex(player=>player.type==='human'&&!player.token&&player.name===supplied);if(index<0)throw new PlayerError(supplied?'No unclaimed seat has that exact name. Check the name used at the saved table.':'Enter your exact saved player name.');const playerToken=token();r.players[index].token=playerToken;r.touched=Date.now();if(r.players.every(player=>player.type==='bot'||player.token)&&!r.resumeCountdownAt){r.resumeCountdownAt=Date.now()+10000;r.resumeCountdownTimer=setTimeout(()=>{if(rooms.get(r.code)!==r||!r.resumePending||!r.players.every(player=>player.type==='bot'||player.token))return;r.resumePending=false;r.resumeCountdownAt=null;r.resumeCountdownTimer=null;r.state.turnStarted=Date.now();r.turnStartState.turnStarted=r.state.turnStarted;bots(r);changed(r);},10000);r.resumeCountdownTimer.unref();}changed(r);return {token:playerToken,room:view(r,playerToken)};}
const clean=(n,fallback=forestName([],random))=>String(n||fallback).trim().slice(0,24)||fallback;
const botName=(i,used=[])=>forestName(used,random);
function view(r,t){const you=r.players.findIndex(p=>p.token===t);if(you<0)throw new PlayerError('Please join this table.');return {canUndo:!!(r.options.undo&&r.history.length&&r.state?.winner===null&&(r.mode==='local'||r.history.at(-1).player===you)),resumePending:!!r.resumePending,resumeWaiting:r.resumePending?r.players.filter(p=>p.type==='human'&&!p.token).map(p=>p.name):[],resumeTurnName:r.resumePending?r.state?.names?.[r.state.turn]||'The saved player':null,resumeCountdownAt:r.resumeCountdownAt||null,notifications:(r.notifications?.[you]||[]).filter(n=>n.expiresAt>Date.now()).map(({id,message,expiresAt})=>({id,message,expiresAt})),code:r.code,phase:r.phase,mode:r.mode,host:r.host,you,players:r.players.map(p=>p.name||''),seatTypes:r.players.map(p=>p.type),seated:r.players.map(p=>!!p.token||p.type==='bot'||r.mode==='local'),round:r.round,dealNumber:r.dealNumber||0,tinkering:r.tinkering,completedGames:r.completedGames,roundResults:r.roundResults||[],matchWinners:r.matchWinners||[],nextRoundAt:r.nextRoundAt||null,dealDecision:r.dealReview?.pending.length?{player:r.dealReview.pending[0],canDecide:r.mode==='local'?you===r.host:you===r.dealReview.pending[0],pairs:r.mode==='local'||you===r.dealReview.pending[0]?duplicatePairs(r.state.hands[r.dealReview.pending[0]]):null}:null,moves:r.moves||[],options:{...r.options,seats:r.players.length},revision:r.revision,totals:r.totals,state:r.state?{...r.state,fieldGroups:(r.state.fieldGroups||[]).map(g=>({owner:g.owner,cards:g.ids.map(id=>r.state.options.variant==='rummikub'?rummikubCards(r.state).get(id):r.state.hands[g.owner].find(c=>c.id===id))})),openingAttempt:(r.state.openingAttempt||[]).map(g=>({...resolveMeld(g.ids.map(id=>{const c=r.state.hands[r.state.turn].find(c=>c.id===id);return g.assignments?.[id]?{...c,as:g.assignments[id]}:c;}),{opening:true,rules:r.options}),owner:r.state.turn})),hands:r.state.hands.map((h,i)=>!r.resumePending&&(r.mode==='local'&&r.players[i].type!=='bot'||i===you)?h:h.map(()=>({hidden:true}))),stock:r.state.stock.map(()=>({hidden:true}))}:null};}
// Automatic moves (bots and timed-out turns) fall back to a plain discard, so a rejected plan can't leave the turn stuck.
function botMove(s){try{return play(s,s.turn,botAction(s),random);}catch{return play(s,s.turn,botDiscard(s),random);}}
function publicState(s){return {...s,fieldGroups:(s.fieldGroups||[]).map(g=>({owner:g.owner,cards:g.ids.map(id=>s.options.variant==='rummikub'?rummikubCards(s).get(id):s.hands[g.owner].find(c=>c.id===id))})),openingAttempt:(s.openingAttempt||[]).map(g=>resolveMeld(g.ids.map(id=>{const c=s.hands[s.turn].find(c=>c.id===id);return g.assignments?.[id]?{...c,as:g.assignments[id]}:c;}),{opening:true,rules:s.options}))};}
function recordMoves(r,before,after){const events=describeMove(publicState(before),publicState(after));r.moves=[...(r.moves||[]),...events.map(event=>({...event,id:r.moveID=(r.moveID||0)+1}))].slice(-80);}
const botScheduler=createBotScheduler({isCurrent:r=>rooms.get(r.code)===r,isBot:r=>r.phase==='game'&&r.state?.winner===null&&!r.resumePending&&!r.dealReview?.pending.length&&r.players[r.state.turn].type==='bot',advance:r=>{const before=r.state;r.state=botMove(before);if(r.state.turn!==before.turn)r.turnStartState=structuredClone(r.state);recordMoves(r,before,r.state);r.history=[];r.turnBackup=null;scoreRound(r);},publish:r=>changed(r),onError:(r,error)=>{console.error(error);r.state.log.push('The woodland player could not complete this move.');}});
function bots(r){if(r.resumePending)return;if(r.dealReview?.pending.length){r.dealReview.pending=r.dealReview.pending.filter(i=>r.players[i].type==='human');if(r.dealReview.pending.length)return;r.state.turnStarted=Date.now();}botScheduler.queue(r);}
function needHost(r,you){if(you!==r.host)throw new PlayerError('Only the host can change this.');}
function needLobby(r,you){needHost(r,you);if(r.phase!=='lobby')throw new PlayerError('Change this before starting the game.');}
function control(r,you){return r.mode==='local'&&you===0&&r.players[r.state.turn].type!=='bot'?r.state.turn:you;}
function startRound(r,redeal=false){
 const names=r.players.map((p,i)=>clean(p.name,p.type==='bot'?botName(i):forestName(r.players.map(p=>p.name),random)));
 r.state=createGame(names,{...r.options,first:(r.round-(redeal?1:0))%names.length},random);r.turnStartState=structuredClone(r.state);r.phase='game';r.moves=[];r.moveID=0;r.history=[];r.turnBackup=null;r.scored=false;r.nextRoundAt=null;if(!redeal)r.round++;r.dealNumber=(r.dealNumber||0)+1;r.dealReview=dealReview(r.state,r.players,r.options.redealDuplicateLimit);bots(r);
}
function scoreRound(r){
 if(!awardRound(r)||!r.nextRoundAt)return;
 const deadline=r.nextRoundAt;
 const timer=setTimeout(()=>{if(rooms.get(r.code)!==r||r.nextRoundAt!==deadline||r.state.winner===null)return;startRound(r);changed(r);},Math.max(0,deadline-Date.now()));timer.unref();
}
// Wake held state requests after every visible table change, including timers and departures.
const waiting=new Map();
function wake(r){for(const done of [...(waiting.get(r.code)||[])])done();}
function changed(r){r.revision++;wake(r);}
function waitForChange(r,res){return new Promise(resolve=>{
 const list=waiting.get(r.code)||new Set();waiting.set(r.code,list);
 const done=()=>{clearTimeout(timer);res.off('close',done);list.delete(done);if(!list.size)waiting.delete(r.code);resolve();};
 const timer=setTimeout(done,25000);list.add(done);res.once('close',done);
});}
const server=http.createServer(async(req,res)=>{res.setHeader('X-Content-Type-Options','nosniff');const url=new URL(req.url,'http://localhost');const send=(s,v)=>{res.writeHead(s,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(v));};try{
 if(url.pathname.startsWith('/api/')){
  const ip=clientAddress(req);if(!limiter.allow(ip))return send(429,{error:'Too many requests. Try again shortly.'});
  let body={};if(req.method==='POST'){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>24000)throw new PlayerError('Request too large.');}try{body=JSON.parse(raw||'{}');}catch{body=null;}if(!body||typeof body!=='object'||Array.isArray(body))throw new PlayerError('Bad request.');}
  const endpoint=url.pathname.slice(5),auth=req.headers.authorization?.replace('Bearer ','');
  if(endpoint==='tables')return send(200,[...rooms.values()].filter(r=>r.phase==='lobby'&&r.mode==='online'&&r.players.some(p=>p.type==='human'&&!p.token)).map(r=>({code:r.code,host:r.players[r.host].name,count:r.players.filter(p=>p.token||p.type==='bot').length,seats:r.players.length})));
  if(endpoint==='create'){if(!creates.allow(ip))return send(429,{error:'Too many new tables. Try again shortly.'});let code;do{code=randomBytes(4).toString('hex');}while(rooms.has(code));const t=token();const r={code,host:0,touched:Date.now(),players:[{name:clean(body.name),token:t,type:'human'},{name:'',token:null,type:'human'}],mode:'online',phase:'lobby',options:{...DEFAULT_RULES,...DEFAULT_WIN_RULES,handSize:14,undo:true,timer:0,variant:'remi51'},revision:0,state:null,history:[],turnBackup:null,totals:[0,0],scored:false,completedGames:0,tinkering:false,round:0};rooms.set(code,r);return send(200,{token:t,room:view(r,t)});}
  if(endpoint==='validate-resume'){let valid=false;try{openResume(body.snapshot);valid=true;}catch(error){if(!(error instanceof PlayerError))throw error;}return send(200,{valid});}
  if(endpoint==='resume'){if(req.method!=='POST')return send(405,{error:'Use POST to resume a table.'});const payload=openResume(body.snapshot);if(!creates.allow(ip))return send(429,{error:'Too many new tables. Try again shortly.'});return send(200,resumeTable(payload,body.name));}
  const r=rooms.get(String(body.code||url.searchParams.get('code')||'').toLowerCase());if(!r)throw new PlayerError('Table not found.');r.touched=Date.now();
  if(endpoint==='join'){const index=r.players.findIndex(p=>p.type==='human'&&!p.token);if(r.mode!=='online'||r.phase!=='lobby'||index<0)throw new PlayerError('This table is not open.');const t=token();r.players[index]={name:clean(body.name),token:t,type:'human'};changed(r);return send(200,{token:t,room:view(r,t)});}
  const you=r.players.findIndex(p=>p.token===auth);if(you<0)throw new PlayerError('Please join this table.');
  if(endpoint==='state'){
   const raw=url.searchParams.get('since'),since=raw===null?null:Number(raw);
   if(raw!==null&&(!Number.isInteger(since)||since<0))throw new PlayerError('Invalid table revision.');
   if(since!==null&&since===r.revision)await waitForChange(r,res);
   if(res.destroyed)return;
   if(!rooms.has(r.code))throw new PlayerError('Table not found.');
   if(since===r.revision){res.writeHead(204,{'Cache-Control':'no-store'});return res.end();}
   return send(200,view(r,auth));
  }
  if(req.method!=='POST')return send(405,{error:'Use POST to change the table.'});
  if(!Number.isInteger(body.revision)||body.revision!==r.revision)return send(409,{error:'The table changed. Review the latest position and try again.',room:view(r,auth)});
  if(endpoint==='snapshot'){const snapshot=continuationCode(r);return send(200,{snapshot,turnName:r.turnStartState.names[r.turnStartState.turn]});}
  if(endpoint==='notification-code'){const note=(r.notifications?.[you]||[]).find(n=>n.id===body.id&&n.expiresAt>Date.now());if(!note)throw new PlayerError('That departure notice has expired.');if(!note.snapshot)throw new PlayerError('A continuation code needs unique names for each human player.');r.notifications[you]=r.notifications[you].filter(n=>n.id!==note.id);changed(r);return send(200,{snapshot:note.snapshot,turnName:note.turnName,room:view(r,auth)});}
  if(r.resumePending&&endpoint!=='leave')throw new PlayerError('Waiting for the original players to rejoin before play can continue.');
  if(endpoint==='settings'&&r.phase!=='lobby'){
   needHost(r,you);
   if(body.timer===undefined||Object.keys(body).some(key=>!['code','revision','timer'].includes(key)))throw new PlayerError('Only the turn timer can be changed during a game.');
   const timer=Number(body.timer);if(![0,30,60,120].includes(timer))throw new PlayerError('Invalid timer setting.');
   if(timer!==r.options.timer){r.options={...r.options,timer};const now=Date.now();for(const state of [r.state,r.turnBackup?.state,...r.history.flatMap(entry=>[entry.state,entry.turnBackup?.state])])if(state)state.turnStarted=now;}
   changed(r);return send(200,view(r,auth));
  }
  if(endpoint==='settings'){
   needLobby(r,you);
   const next={...r.options};
   if(body.variant!==undefined){if(!['remi51','rummikub'].includes(body.variant))throw new PlayerError('Unknown variant.');Object.assign(next,body.variant==='rummikub'?RUMMIKUB_RULES:{...DEFAULT_RULES,variant:'remi51',handSize:14});}
   if(body.handSize!==undefined){const n=Number(body.handSize);if(!Number.isInteger(n)||n<7||n>14)throw new PlayerError('Choose 7–14 starting cards.');next.handSize=n;}
   const enums={jokerCount:[4,8],dealDuplicateLimit:[0,3,4],redealDuplicateLimit:[0,3,4],winMode:['none','round','stacking','multi'],winTarget:[101,151,301,501],opening:next.variant==='rummikub'?[30,31]:[31,51],aceMode:['both','low','high'],aceSeriesValue:['ten','one'],firstLapDiscard:['blocked','take-no-open'],handBonus:[80,100],cutBonus:[120,140],timer:[0,30,60,120]};
   for(const[key,allowed]of Object.entries(enums))if(body[key]!==undefined){const value=typeof allowed[0]==='number'?Number(body[key]):body[key];if(!allowed.includes(value))throw new PlayerError('Invalid '+key+' setting.');next[key]=value;}
   if(Number(body.dealDuplicateLimit)>0&&Number(body.redealDuplicateLimit)>0)throw new PlayerError('Choose one duplicate threshold at a time.');
   if(Number(body.dealDuplicateLimit)>0)next.redealDuplicateLimit=0;
   if(Number(body.redealDuplicateLimit)>0)next.dealDuplicateLimit=0;
   for(const key of ['winEnabled','jokerEnds','handEnabled','handRequiresOpening','handJokers','handDouble','cutEnabled','undo','turnOver4Sets','publicDiscardPile'])if(body[key]!==undefined){if(typeof body[key]!=='boolean')throw new PlayerError('Invalid '+key+' setting.');next[key]=body[key];}
   if(body.tinkering!==undefined&&typeof body.tinkering!=='boolean')throw new PlayerError('Invalid rules panel state.');
   if(body.mode!==undefined){if(!['local','hotseat','bot','online'].includes(body.mode))throw new PlayerError('Unknown mode.');if(body.mode!=='online'&&r.players.some((p,i)=>i!==you&&p.token))throw new PlayerError('Your online friends are seated. They must leave before switching to local play.');r.mode=body.mode==='online'?'online':'local';if(body.mode==='bot')for(let i=1;i<r.players.length;i++)r.players[i]={name:botName(i,r.players.map(p=>p.name)),token:null,type:'bot'};}
   if(next.variant==='rummikub')Object.assign(next,rummikubRules(next));
   r.options=next;
   if(body.tinkering!==undefined)r.tinkering=body.tinkering;
   if(r.mode==='local')r.players.forEach((p,i)=>{if(i&&p.type==='human'&&!p.name)p.name=forestName(r.players.map(p=>p.name),random);});
   if(r.mode==='local'&&body.names)r.players.forEach((p,i)=>{if(i&&p.type==='human'&&body.names[i]!==undefined)p.name=clean(body.names[i],forestName(r.players.map(p=>p.name),random));});
  }else if(endpoint==='seat'){
   needLobby(r,you);const index=Number(body.index);
   if(body.operation==='add'){if(r.players.length>=6)throw new PlayerError('This variant has no more player seats.');const type=body.type==='bot'?'bot':'human';r.players.push({name:type==='bot'||r.mode==='local'?botName(r.players.length,r.players.map(p=>p.name)):'',token:null,type});r.totals.push(0);}
   else{if(!Number.isInteger(index)||index<0||index>=r.players.length||index===r.host)throw new PlayerError('Choose another player seat.');if(body.operation==='kick'){if(r.mode!=='online'||r.players[index].type!=='human'||!r.players[index].token)throw new PlayerError('Choose a connected online player to kick.');r.players[index]={name:'',token:null,type:'human'};}else{if(r.players[index].token)throw new PlayerError('This player is already connected.');if(body.operation==='remove'){if(r.players.length<=2)throw new PlayerError('Keep at least two seats.');r.players.splice(index,1);r.totals.splice(index,1);}else if(body.operation==='type'){r.players[index].type=body.type==='bot'?'bot':'human';r.players[index].name=r.players[index].type==='bot'||r.mode==='local'?botName(index,r.players.map(p=>p.name)):'';}else if(body.operation==='name'){r.players[index].name=clean(body.name,forestName(r.players.map(p=>p.name),random));}else throw new PlayerError('Unknown seat action.');}}
  }else if(endpoint==='start'||endpoint==='rematch'){
   needHost(r,you);if(r.tinkering)throw new PlayerError('Return from the grimoire before starting.');if(endpoint==='start'&&r.phase!=='lobby')throw new PlayerError('The game has already started.');if(endpoint==='rematch'&&r.state?.winner===null)throw new PlayerError('Finish the round first.');
   if(r.mode==='online'&&r.players.some(p=>p.type==='human'&&!p.token))throw new PlayerError('Wait for a player in each human seat, or change an empty seat to a bot.');
   if(r.mode==='local'&&body.names)r.players.forEach((p,i)=>{if(i>0&&p.type==='human'&&body.names[i]!==undefined)p.name=clean(body.names[i],forestName(r.players.map(p=>p.name),random));});
   if(r.nextRoundAt)throw new PlayerError('The next round is already starting.');if(r.matchWinners?.length)resetMatch(r);startRound(r);
  }else if(endpoint==='deal-decision'){
   if(r.phase!=='game'||!r.dealReview?.pending.length)throw new PlayerError('No redeal decision is pending.');
   const deciding=r.dealReview.pending[0];if(!(r.mode==='local'&&you===r.host)&&you!==deciding)throw new PlayerError('Another player is deciding.');
   if(typeof body.redeal!=='boolean')throw new PlayerError('Choose whether to keep or re-deal.');
   if(body.redeal)startRound(r,true);else{r.dealReview.pending.shift();r.state.turnStarted=Date.now();bots(r);}
  }else if(endpoint==='action'){
   if(r.dealReview?.pending.length)throw new PlayerError('Wait for the duplicate redeal decision.');
   if(r.phase!=='game')throw new PlayerError('The game has not started.');const p=control(r,you),prior=r.state,priorBackup=r.turnBackup;
   if(prior.turn!==p||r.players[p].type==='bot')throw new PlayerError('It is not your turn.');
   const next=play(prior,p,body.action,random);r.history.push({state:prior,player:p,turnBackup:priorBackup});if(body.action.type==='draw')r.turnBackup={state:prior,player:p};r.state=next;if(next.turn!==prior.turn)r.turnStartState=structuredClone(next);recordMoves(r,prior,next);
   // Undo stays within the current turn and can't take back a draw that revealed a hidden card.
   if(body.action.type==='draw'&&body.action.source!=='discard'||next.turn!==prior.turn||next.winner!==null)r.history=[];
   if(next.turn!==prior.turn||next.winner!==null)r.turnBackup=null;bots(r);scoreRound(r);
  }else if(endpoint==='cancel-draw'){
   const p=control(r,you);if(!r.turnBackup||r.turnBackup.player!==p||r.state.turn!==p||!r.state.mustOpen&&!r.state.mustHand)throw new PlayerError('Only a discard or cut-card draw that requires an opening can be cancelled.');r.state=r.turnBackup.state;r.turnBackup=null;r.history=[];
  }else if(endpoint==='undo'){
   if(!r.options.undo||!r.history.length||r.state.winner!==null)throw new PlayerError('Nothing to undo.');const last=r.history.at(-1);if(r.mode!=='local'&&last.player!==you)throw new PlayerError('Only your latest action can be undone.');r.history.pop();r.state=last.state;r.turnBackup=last.turnBackup;
  }else if(endpoint==='leave'){
   // The table closes only when its last player leaves. Local tables have just one connected host.
   if(r.resumePending){r.players[you].token=null;if(r.resumeCountdownTimer){clearTimeout(r.resumeCountdownTimer);r.resumeCountdownTimer=null;r.resumeCountdownAt=null;}changed(r);return send(200,{left:true});}const others=r.players.map((p,i)=>i).filter(i=>i!==you&&r.players[i].token);if(!others.length){botScheduler.stop(r);rooms.delete(r.code);wake(r);return send(200,{left:true});}
   // In the lobby the host keeps the first seat, so a leaving host's seat goes to the next player.
   if(r.phase==='lobby'){const seat=you===r.host?others[0]:you;r.players[you]=r.players[seat];r.players[seat]={name:'',token:null,type:'human'};}
   else{
    // Keep the continuation checkpoint and notify the remaining players before the seat becomes a bot.
    notifyDeparture(r,you);r.players[you]={...r.players[you],token:null,type:'bot'};if(you===r.host)r.host=others.find(i=>i>you)??others[0];
    // A draw that still needs an opening is taken back, as when the timer runs out, so the bot can always finish the turn.
    if(r.state.turn===you&&r.state.winner===null){if(r.turnBackup)r.state=r.turnBackup.state;r.turnBackup=null;r.history=[];}
    r.state.log.push(`${r.state.names[you]} left the table. A bot plays the seat.`);bots(r);scoreRound(r);
   }
   changed(r);return send(200,{left:true});
  }else throw new PlayerError('Unknown request.');changed(r);return send(200,view(r,auth));
 }
 // Resolve as a plain file path (never a URL, which would honour file: and %2e%2e) and refuse anything outside public/.
 let path;try{path=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));}catch{res.writeHead(400);return res.end('Bad request');}
 const file=resolve(publicDir,path);if(!file.startsWith(publicDir)||path.includes('\0')){res.writeHead(403);return res.end();}
 const info=await stat(file).catch(()=>null);if(!info?.isFile()){res.writeHead(404);return res.end('Not found');}
 // Art and fonts rarely change, so browsers keep them for a week; pages and code are checked on every load.
 const type=extname(file),etag=`W/"${info.size.toString(36)}-${info.mtime.getTime().toString(36)}"`,headers={'Content-Type':types[type]||'application/octet-stream','Cache-Control':/^(art|fonts)\//.test(path)?'public, max-age=604800':'no-cache',ETag:etag,Vary:'Accept-Encoding'};
 if(req.headers['if-none-match']?.split(/\s*,\s*/).includes(etag)){res.writeHead(304,headers);return res.end();}
 if(compressible.has(type)&&/\bgzip\b/.test(req.headers['accept-encoding']||'')){let cached=zipped.get(file);if(cached?.etag!==etag)zipped.set(file,cached={etag,data:await gzipAsync(await readFile(file))});res.writeHead(200,{...headers,'Content-Encoding':'gzip'});return res.end(cached.data);}
 res.writeHead(200,headers);res.end(await readFile(file));
 }catch(e){
  // Messages written for players pass through; anything else is a server fault and stays in the server log.
  if(e instanceof PlayerError)return send(400,{error:e.message});console.error(e);if(res.headersSent)return res.end();send(500,{error:'Something went wrong. Try again.'});
 }});
setInterval(()=>{for(const r of rooms.values()){if(r.phase!=='game'||r.state.winner!==null||r.resumePending||r.dealReview?.pending.length||!r.options.timer||r.players[r.state.turn].type==='bot')continue;if(Date.now()-r.state.turnStarted>r.options.timer*1000){try{if(r.turnBackup){r.state=r.turnBackup.state;r.turnBackup=null;}let guard=0,p=r.state.turn;if(r.options.variant==='rummikub'){const dirty=JSON.stringify(r.state.fieldGroups.map(g=>g.ids))!==JSON.stringify(r.state.melds.map(g=>g.cards.map(c=>c.id)));const before=r.state;r.state=play(before,p,{type:dirty?'rk-penalty':'draw',source:'stock'},random);recordMoves(r,before,r.state);}while(r.state.turn===p&&r.state.winner===null&&guard++<60){const before=r.state;r.state=botMove(before);recordMoves(r,before,r.state);}if(r.state.turn!==p)r.turnStartState=structuredClone(r.state);bots(r);scoreRound(r);r.history=[];changed(r);}catch(e){console.error(e);r.state.turnStarted=Date.now();r.state.log.push('The timer could not finish the turn.');changed(r);}}}},1000).unref();
// Tables live only in memory: one untouched for a day is removed, and so are request counts for quiet addresses.
setInterval(()=>{expireTables(rooms);for(const[id,code]of resumeRooms)if(!rooms.has(code))resumeRooms.delete(id);limiter.sweep();creates.sweep();},60000).unref();
server.listen(port,address,()=>console.log(`Fablewood Rummy: http://${address.includes(':')?`[${address}]`:address}:${server.address().port}`));
