import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,play,botAction} from '../public/engine.js';
import {newTurnAnnouncement,turnAnnouncementMarkup} from '../public/turn-announcements.js';

const card=(id,rank,suit='fox')=>({id,rank,suit});
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function ready(names=['A','B']){
 const state=createGame(names,{variant:'hunt-escape'},()=>0.37);
 state.turn=0;state.turns=names.length*2;state.stage='meld';state.roles=names.map(()=>'hunt');state.opened=names.map(()=>true);
 state.stock=Array.from({length:30},(_,index)=>card(`stock-${index}`,(index%9)+2,'toad'));
 return state;
}

test('Quenched is always exactly four cleanses and never stacks',()=>{
 let state=ready();state.hands[0]=[card('q1',12),card('q2',12,'owl'),card('keep',9)];
 state=play(state,0,{type:'discard',ids:['q1','q2']});
 assert.equal(state.turn,1);assert.equal(state.discardRequired,4);
 // Further Quench cleanses later in the game still demand four, not five or more.
 state.stage='meld';state.hands[1]=[card('q3',12),card('b',3,'hare'),...Array.from({length:6},(_,i)=>card(`b-${i}`,4+i,'toad'))];
 state.discardRequired=2;state=play(state,1,{type:'discard',ids:['q3','b']});
 assert.equal(state.turn,0);assert.equal(state.discardRequired,4);
 state.stage='meld';state.hands[0]=Array.from({length:6},(_,i)=>card(`a-${i}`,2+i,'hare'));
 assert.throws(()=>play(state,0,{type:'discard',ids:state.hands[0].slice(0,3).map(item=>item.id)}),/4/);
 assert.throws(()=>play(state,0,{type:'discard',ids:state.hands[0].slice(0,5).map(item=>item.id)}),/4|exactly/);
 const done=play(state,0,{type:'discard',ids:state.hands[0].slice(0,4).map(item=>item.id)});
 assert.equal(done.turn,1);assert.equal(done.discardRequired,2);
});

test('a short-handed Quenched player draws enough to make four cleanses',()=>{
 let state=ready();state.hands[0]=[card('q',12),card('plain',2,'hare'),card('keep',9)];state.hands[1]=[card('one',5,'hare')];
 state=play(state,0,{type:'discard',ids:['q','plain']});
 // Two Hurries would normally leave no draw, but the Quenched player still needs four cards.
 state.hurryDraw[1]=2;
 assert.throws(()=>play(state,1,{type:'skip-hurry-draw'}),/skip drawing/);
 assert.equal(botAction(state).type,'draw');
 state=play(state,1,{type:'draw',source:'stock'});
 assert.equal(state.stage,'meld');assert.equal(state.hands[1].length,4);assert.equal(state.skipDiscard,false);
 assert.throws(()=>play(state,1,{type:'meld',ids:[state.hands[1][0].id,state.hands[1][1].id]}),/Keep 4 cards/);
});

test('the second-turn single discard pickup still leaves a Quenched player four cards',()=>{
 let state=ready();state.turns=2;state.hands[0]=[card('q',12),card('plain',2,'hare'),card('keep',9)];state.hands[1]=[card('one',5,'hare')];
 state=play(state,0,{type:'discard',ids:['q','plain']});
 assert.equal(state.turns,3);state.discardPiles[0].at(-1).protected=false;state.discardPiles[1].push(card('free',7,'owl'));
 state=play(state,1,{type:'draw',source:'discard-1'});
 assert.equal(state.stage,'draw');assert.equal(state.hands[1].length,2);
 state=play(state,1,{type:'draw',source:'stock'});
 assert.equal(state.stage,'meld');assert.equal(state.hands[1].length,4);
});

test('the Quenched requirement holds across staged cleanses and expires after the fourth',()=>{
 let state=ready();state.hands[0]=[card('q',12),card('plain',2,'hare'),card('keep',9)];
 state=play(state,0,{type:'discard',ids:['q','plain']});
 state.stage='meld';state.hands[1]=Array.from({length:6},(_,i)=>card(`h-${i}`,2+i,'hare'));
 for(let i=0;i<3;i++){state=play(state,1,{type:'stage-discard',ids:[`h-${i}`]});assert.equal(state.discardRequired,4);assert.deepEqual(state.cleanseIndicators.flat().map(item=>item.effect),['Quench']);}
 state=play(state,1,{type:'stage-discard',ids:['h-3']});
 assert.equal(state.turn,0);assert.equal(state.pendingDiscard,null);assert.deepEqual(state.cleanseIndicators,[[],[]]);
});

test('turn-end announcements name the affected next player and the mover’s self effects',()=>{
 let state=ready(['Ash','Birch','Cedar']);
 state.hands[0]=[card('q',12),card('h',10,'owl'),card('keep',9)];
 state=play(state,0,{type:'discard',ids:['q','h']});
 assert.deepEqual(state.turnAnnouncement,{sequence:1,player:0,next:1,nextEffects:['Quenched','Hurried'],selfEffects:[]});

 state.stage='meld';state.hurryDraw[1]=0;state.discardRequired=2;state.hands[1]=[card('ace',1,'hare'),card('blaze',11,'owl'),card('keep-b',9,'toad')];
 state=play(state,1,{type:'discard',ids:['ace','blaze']});
 assert.deepEqual(state.turnAnnouncement,{sequence:2,player:1,next:2,nextEffects:[],selfEffects:['Arisen','Blazed']});

 // A plain cleanse publishes nothing new.
 state.stage='meld';state.hands[2]=[card('x',3,'hare'),card('y',4,'hare'),card('z',5,'hare')];
 state=play(state,2,{type:'discard',ids:['x','y']});assert.equal(state.turnAnnouncement.sequence,2);

 state.stage='meld';state.melds=[{id:'pack',owner:1,kind:'set',rank:7,closed:false,cards:[card('p1',7),card('p2',7,'owl')]}];state.hands[0]=[card('e',13),card('w',6,'hare'),card('keep-c',8,'toad')];
 state=play(state,0,{type:'discard',ids:['e','w']});assert.equal(state.turnAnnouncement.sequence,2,'announces only once the Evoke turn ends');
 state=play(state,0,{type:'evoke',meldId:'pack'});
 assert.deepEqual(state.turnAnnouncement,{sequence:3,player:0,next:1,nextEffects:[],selfEffects:['Evoked']});
});

test('first-turn Hs and mandatory Quench Aces are not announced',()=>{
 let state=createGame(['A','B'],{variant:'hunt-escape'},()=>0.37);state.hands[0]=[card('h1',10),card('h2',10,'owl'),card('keep',9)];
 state=play(state,0,{type:'discard',ids:['h1','h2']});assert.equal(state.turnAnnouncement,undefined);
 state=ready();state.discardRequired=4;state.hands[0]=[card('ace',1,'hare'),card('a',2,'hare'),card('b',3,'hare'),card('c',4,'hare'),card('keep',9)];
 state=play(state,0,{type:'discard',ids:['ace','a','b','c']});assert.equal(state.turnAnnouncement,undefined);
});

test('clients show each announcement once and render only known effects',()=>{
 const event={sequence:2,player:1,next:2,nextEffects:['Quenched'],selfEffects:['Evoked','Arisen']};
 assert.equal(newTurnAnnouncement(null,{turns:5,winner:null,turnAnnouncement:event}),null,'joining clients do not replay old announcements');
 assert.equal(newTurnAnnouncement({turns:4,turnAnnouncement:{sequence:1}},{turns:5,winner:null,turnAnnouncement:event}),event);
 assert.equal(newTurnAnnouncement({turns:5,turnAnnouncement:event},{turns:5,winner:null,turnAnnouncement:event}),null);
 assert.equal(newTurnAnnouncement({turns:4,turnAnnouncement:{sequence:1}},{turns:5,winner:1,turnAnnouncement:event}),null,'a finished round shows its results instead');
 assert.deepEqual(newTurnAnnouncement({turns:40,turnAnnouncement:{sequence:9}},{turns:1,winner:null,turnAnnouncement:{sequence:1,player:0,next:1,nextEffects:['Hurried'],selfEffects:[]}})?.sequence,1,'a new round restarts the sequence');
 const html=turnAnnouncementMarkup({...event,selfEffects:[...event.selfEffects,'<b>']},['Ash','Birch','<Cedar>'],esc);
 assert.equal(html,'<div class="turn-announcement-section"><div class="turn-announcement-name">&lt;Cedar&gt; is:</div><div class="turn-announcement-row"><span class="turn-announcement-effect effect-quenched">Quenched</span></div></div><div class="turn-announcement-section"><div class="turn-announcement-name">Birch has:</div><div class="turn-announcement-row"><span class="turn-announcement-effect effect-evoked">Evoked</span><span class="turn-announcement-effect effect-arisen">Arisen</span></div></div>');
 assert.equal(turnAnnouncementMarkup({sequence:1,player:0,next:1,nextEffects:[],selfEffects:['Blazed']},['Ash','Birch'],esc),'<div class="turn-announcement-section"><div class="turn-announcement-name">Ash has:</div><div class="turn-announcement-row"><span class="turn-announcement-effect effect-blazed">Blazed</span></div></div>');
});
