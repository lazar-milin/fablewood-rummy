import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createGame,play,botAction,botDiscard,DEFAULT_RULES} from './public/engine.js';
import {forestName} from './public/names.js';
const rooms=new Map(),port=Number(process.env.PORT||3010),publicDir=fileURLToPath(new URL('./public/',import.meta.url));
const token=()=>randomBytes(16).toString('hex');
const clean=(n,fallback=forestName())=>String(n||fallback).trim().slice(0,24)||fallback;
const botName=(i,used=[])=>forestName(used);
function view(r,t){const you=r.players.findIndex(p=>p.token===t);if(you<0)throw Error('Please join this table.');return {canUndo:!!(r.options.undo&&r.history.length&&r.state?.winner===null&&(r.mode==='hotseat'||r.history.at(-1).player===you)),code:r.code,phase:r.phase,mode:r.mode,host:0,you,players:r.players.map(p=>p.name||''),seatTypes:r.players.map(p=>p.type),seated:r.players.map(p=>!!p.token||p.type==='bot'||r.mode==='hotseat'),round:r.round,tinkering:r.tinkering,completedGames:r.completedGames,options:{...r.options,seats:r.players.length},revision:r.revision,totals:r.totals,state:r.state?{...r.state,hands:r.state.hands.map((h,i)=>r.mode==='hotseat'&&r.players[i].type!=='bot'||i===you?h:h.map(()=>({hidden:true}))),stock:r.state.stock.map(()=>({hidden:true}))}:null};}
// Automatic moves (bots and timed-out turns) fall back to a plain discard, so a rejected plan can't leave the turn stuck.
function botMove(s){try{return play(s,s.turn,botAction(s));}catch{return play(s,s.turn,botDiscard(s));}}
function bots(r){let guard=0;while(r.state?.winner===null&&r.players[r.state.turn].type==='bot'&&guard++<150)r.state=botMove(r.state);}
function needHost(r,you){if(you!==0)throw Error('Only the host can change this.');}
function needLobby(r,you){needHost(r,you);if(r.phase!=='lobby')throw Error('Change this before starting the game.');}
function control(r,you){return r.mode==='hotseat'&&you===0&&r.players[r.state.turn].type!=='bot'?r.state.turn:you;}
function scoreRound(r){if(r.state.winner===null||r.scored)return;r.totals=r.totals.map((n,i)=>n+r.state.scores[i]);r.scored=true;r.completedGames++;}
const server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');const send=(s,v)=>{res.writeHead(s,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(v));};try{
 if(url.pathname.startsWith('/api/')){
  let body={};if(req.method==='POST'){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>24000)throw Error('Request too large.');}body=JSON.parse(raw||'{}');}
  const endpoint=url.pathname.slice(5),auth=req.headers.authorization?.replace('Bearer ','');
  if(endpoint==='tables')return send(200,[...rooms.values()].filter(r=>r.phase==='lobby'&&r.mode==='online'&&r.players.some(p=>p.type==='human'&&!p.token)).map(r=>({code:r.code,host:r.players[0].name,count:r.players.filter(p=>p.token||p.type==='bot').length,seats:r.players.length})));
  if(endpoint==='create'){let code;do{code=randomBytes(4).toString('hex');}while(rooms.has(code));const t=token();const r={code,players:[{name:clean(body.name),token:t,type:'human'},{name:'',token:null,type:'human'}],mode:'online',phase:'lobby',options:{...DEFAULT_RULES,handSize:14,undo:true,timer:0,variant:'remi51'},revision:0,state:null,history:[],turnBackup:null,totals:[0,0],scored:false,completedGames:0,tinkering:false,round:0};rooms.set(code,r);return send(200,{token:t,room:view(r,t)});}
  const r=rooms.get(String(body.code||url.searchParams.get('code')||'').toLowerCase());if(!r)throw Error('Table not found.');
  if(endpoint==='join'){const index=r.players.findIndex(p=>p.type==='human'&&!p.token);if(r.mode!=='online'||r.phase!=='lobby'||index<0)throw Error('This table is not open.');const t=token();r.players[index]={name:clean(body.name),token:t,type:'human'};r.revision++;return send(200,{token:t,room:view(r,t)});}
  const you=r.players.findIndex(p=>p.token===auth);if(you<0)throw Error('Please join this table.');
  if(endpoint==='state')return send(200,view(r,auth));
  if(endpoint==='settings'){
   needLobby(r,you);
   const next={...r.options};
   if(body.handSize!==undefined){const n=Number(body.handSize);if(!Number.isInteger(n)||n<7||n>14)throw Error('Choose 7–14 starting cards.');next.handSize=n;}
   const enums={opening:[31,51],aceMode:['both','low','high'],handBonus:[80,100],cutBonus:[120,140],timer:[0,30,60,120]};
   for(const[key,allowed]of Object.entries(enums))if(body[key]!==undefined){const value=typeof allowed[0]==='number'?Number(body[key]):body[key];if(!allowed.includes(value))throw Error('Invalid '+key+' setting.');next[key]=value;}
   for(const key of ['jokerEnds','handEnabled','handRequiresOpening','handJokers','handDouble','cutEnabled','undo'])if(body[key]!==undefined){if(typeof body[key]!=='boolean')throw Error('Invalid '+key+' setting.');next[key]=body[key];}
   if(body.tinkering!==undefined&&typeof body.tinkering!=='boolean')throw Error('Invalid rules panel state.');
   if(body.mode!==undefined){if(!['hotseat','bot','online'].includes(body.mode))throw Error('Unknown mode.');if(body.mode!=='online'&&r.players.slice(1).some(p=>p.token))throw Error('Your online friends are seated. They must leave before switching to local play.');r.mode=body.mode;if(r.mode==='bot')for(let i=1;i<r.players.length;i++)r.players[i]={name:botName(i,r.players.map(p=>p.name)),token:null,type:'bot'};}
   r.options=next;
   if(body.tinkering!==undefined)r.tinkering=body.tinkering;
   if(r.mode==='hotseat')r.players.forEach((p,i)=>{if(i&&p.type==='human'&&!p.name)p.name=forestName(r.players.map(p=>p.name));});
   if(r.mode==='hotseat'&&body.names)r.players.forEach((p,i)=>{if(i&&p.type==='human'&&body.names[i]!==undefined)p.name=clean(body.names[i],forestName(r.players.map(p=>p.name)));});
  }else if(endpoint==='seat'){
   needLobby(r,you);const index=Number(body.index);
   if(body.operation==='add'){if(r.players.length>=6)throw Error('Up to six seats are supported.');const type=body.type==='bot'?'bot':'human';r.players.push({name:type==='bot'||r.mode==='hotseat'?botName(r.players.length,r.players.map(p=>p.name)):'',token:null,type});r.totals.push(0);}
   else{if(!Number.isInteger(index)||index<1||index>=r.players.length)throw Error('Choose a player seat.');if(r.players[index].token)throw Error('This player is already connected.');if(body.operation==='remove'){if(r.players.length<=2)throw Error('Keep at least two seats.');r.players.splice(index,1);r.totals.splice(index,1);}else if(body.operation==='type'){r.players[index].type=body.type==='bot'?'bot':'human';r.players[index].name=r.players[index].type==='bot'||r.mode==='hotseat'?botName(index,r.players.map(p=>p.name)):'';}else if(body.operation==='name'){r.players[index].name=clean(body.name,forestName(r.players.map(p=>p.name)));}else throw Error('Unknown seat action.');}
  }else if(endpoint==='start'||endpoint==='rematch'){
   needHost(r,you);if(r.tinkering)throw Error('Return from the grimoire before starting.');if(endpoint==='start'&&r.phase!=='lobby')throw Error('The game has already started.');if(endpoint==='rematch'&&r.state?.winner===null)throw Error('Finish the round first.');
   if(r.mode==='online'&&r.players.some(p=>p.type==='human'&&!p.token))throw Error('Wait for a player in each human seat, or change an empty seat to a bot.');
   if(r.mode==='hotseat'&&body.names)r.players.forEach((p,i)=>{if(i>0&&p.type==='human'&&body.names[i]!==undefined)p.name=clean(body.names[i],forestName(r.players.map(p=>p.name)));});
   const names=r.players.map((p,i)=>clean(p.name,p.type==='bot'?botName(i):forestName(r.players.map(p=>p.name))));r.state=createGame(names,{...r.options,first:r.round%names.length});r.phase='game';r.history=[];r.turnBackup=null;r.scored=false;r.round++;bots(r);
  }else if(endpoint==='action'){
   if(r.phase!=='game')throw Error('The game has not started.');const p=control(r,you),prior=r.state,priorBackup=r.turnBackup;
   if(prior.turn!==p||r.players[p].type==='bot')throw Error('It is not your turn.');
   const next=play(prior,p,body.action);r.history.push({state:prior,player:p,turnBackup:priorBackup});if(body.action.type==='draw')r.turnBackup={state:prior,player:p};r.state=next;
   if(next.turn!==prior.turn||next.winner!==null)r.turnBackup=null;bots(r);scoreRound(r);
  }else if(endpoint==='cancel-draw'){
   const p=control(r,you);if(!r.turnBackup||r.turnBackup.player!==p||r.state.turn!==p||!r.state.mustOpen&&!r.state.mustHand)throw Error('Only a discard or cut-card draw that requires an opening can be cancelled.');r.state=r.turnBackup.state;r.turnBackup=null;r.history=[];
  }else if(endpoint==='undo'){
   if(!r.options.undo||!r.history.length||r.state.winner!==null)throw Error('Nothing to undo.');const last=r.history.at(-1);if(r.mode!=='hotseat'&&last.player!==you)throw Error('Only your latest action can be undone.');r.history.pop();r.state=last.state;r.turnBackup=last.turnBackup;
  }else if(endpoint==='leave'){
   if(you===0||r.phase==='game'){rooms.delete(r.code);return send(200,{left:true});}r.players[you]={name:'',token:null,type:'human'};r.revision++;return send(200,{left:true});
  }else throw Error('Unknown request.');r.revision++;return send(200,view(r,auth));
 }
 // Resolve as a plain file path (never a URL, which would honour file: and %2e%2e) and refuse anything outside public/.
 const path=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1)),file=resolve(publicDir,path);if(!file.startsWith(publicDir)||path.includes('\0')){res.writeHead(403);return res.end();}let data;try{data=await readFile(file);}catch{res.writeHead(404);return res.end('Not found');}res.writeHead(200,{'Content-Type':path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':path.endsWith('.ttf')?'font/ttf':path.endsWith('.png')?'image/png':path.endsWith('.svg')?'image/svg+xml':'text/html','Cache-Control':'no-cache'});res.end(data);
 }catch(e){send(400,{error:e.message});}});
setInterval(()=>{for(const r of rooms.values()){if(r.phase!=='game'||r.state.winner!==null||!r.options.timer)continue;if(Date.now()-r.state.turnStarted>r.options.timer*1000){try{if(r.turnBackup){r.state=r.turnBackup.state;r.turnBackup=null;}let guard=0,p=r.state.turn;while(r.state.turn===p&&r.state.winner===null&&guard++<60)r.state=botMove(r.state);bots(r);scoreRound(r);r.history=[];r.revision++;}catch(e){r.state.turnStarted=Date.now();r.state.log.push('Timer could not finish the turn: '+e.message);r.revision++;}}}},1000).unref();
server.listen(port,'0.0.0.0',()=>console.log(`Fablewood Rummy: http://127.0.0.1:${port}`));
