import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,play,resolveMeld,botAction} from '../public/engine.js';
import {resolveHuntEscapeMeld} from '../public/hunt-escape.js';

const c=(rank,suit='fox',copy=0)=>({id:`${copy}-${suit}-${rank}`,rank,suit});
const ready=(names=['A','B'])=>{const s=createGame(names,{variant:'hunt-escape'},()=>0.37);s.turn=0;s.turns=names.length;s.stage='meld';return s;};
const play0=(s,type,data={})=>play(s,0,{type,...data});

test('Sylvan Trail deals nine cards, starts with discard-only turns and leaves mixed spirit choices unset',()=>{
 const s=createGame(['Fox','Hare'],{variant:'hunt-escape'},()=>0.4);assert.equal(s.stage,'first-discard');assert.deepEqual(s.hands.map(hand=>hand.length),[9,9]);
 s.hands[0]=[c(2,'fox'),c(4,'hare'),c(3,'owl'),c(5,'toad')];const next=play0(s,'discard',{ids:[c(2,'fox').id,c(4,'hare').id]});assert.equal(next.roles[0],null);assert.equal(next.turn,1);assert.equal(next.stage,'first-discard');
});

test('spirit changes follow the actual number and family of discarded cards',()=>{
 const discardWith=(cards,role='hunt')=>{const s=ready();s.roles[0]=role;s.discardRequired=cards.length;s.skipDiscard=cards.length===0;s.hands[0]=[...cards,c(8,'toad')];return play0(s,'discard',{ids:cards.map(card=>card.id)}).roles[0];};
 assert.equal(discardWith([],'escape'),'escape');
 assert.equal(discardWith([c(2,'fox')]),'escape');assert.equal(discardWith([c(2,'hare')]),'hunt');
 assert.equal(discardWith([c(2,'fox'),c(3,'owl')]),'escape');assert.equal(discardWith([c(2,'hare'),c(3,'toad')]),'hunt');
 assert.equal(discardWith([c(2,'fox'),c(3,'hare')]),'hunt');
 assert.equal(discardWith([c(2,'fox'),c(3,'owl'),c(4,'fox')]),'escape');assert.equal(discardWith([c(2,'hare'),c(3,'toad'),c(4,'hare')]),'hunt');
 assert.equal(discardWith([c(2,'fox'),c(3,'hare'),c(4,'owl')]),'hunt');
 assert.equal(discardWith([{id:'joker-0',joker:true},c(3,'fox')],'escape'),'hunt');
 assert.equal(discardWith([{id:'joker-0',joker:true},c(3,'hare')],null),'hunt');
});

test('first-turn H cards are protected from discard pickup but do not trigger Hurry',()=>{
 const s=createGame(['Fox','Hare'],{variant:'hunt-escape'});s.hands[0]=[c(10,'fox'),c(10,'owl'),c(3,'hare'),c(4,'toad')];
 const next=play0(s,'discard',{ids:[c(10,'fox').id,c(10,'owl').id]});assert.equal(next.hurryDraw[1],0);assert.ok(next.discardPiles.every(pile=>pile.at(-1)?.protected));assert.equal(next.discardPiles[0].at(-1).discardEffect,undefined);
 next.turn=1;next.turns=2;next.stage='draw';next.opened[1]=true;assert.throws(()=>play(next,1,{type:'draw',source:'discard-0'}),/H card is protected/);
});

test('one H gives the next player exactly one draw, and two Hs discarded together give none',()=>{
 const one=ready();one.hands[0]=[c(10,'fox'),c(6,'owl'),c(2,'hare'),c(3,'toad')];one.hands[1]=[c(1,'hare'),c(2,'hare',1),c(3,'hare',1),c(4,'hare',1),c(5,'hare',1)];
 let next=play0(one,'discard',{ids:[c(10,'fox').id,c(6,'owl').id]});assert.equal(next.hurryDraw[1],1);assert.equal(next.discardPiles[0].at(-1).discardEffect,'Hurry');assert.throws(()=>play(next,1,{type:'draw',source:'discard-0'}),/H card is protected/);const start=next.hands[1].length;next=play(next,1,{type:'draw',source:'stock'});assert.equal(next.hands[1].length,start+1);assert.equal(next.stage,'meld');assert.equal(next.hurryDraw[1],1);

 const two=ready();two.hands[0]=[c(10,'fox'),c(10,'owl'),c(2,'hare'),c(3,'toad')];two.hands[1]=[c(1,'hare'),c(2,'hare',1),c(3,'hare',1)];
 let noDraw=play0(two,'discard',{ids:[c(10,'fox').id,c(10,'owl').id]});assert.equal(noDraw.hurryDraw[1],2);const before=noDraw.hands[1].length;assert.throws(()=>play(noDraw,1,{type:'draw',source:'stock'}),/Hurry leaves no cards/);noDraw=play(noDraw,1,{type:'skip-hurry-draw'});assert.equal(noDraw.stage,'meld');assert.equal(noDraw.hands[1].length,before);assert.equal(noDraw.hurryDraw[1],2);
});

test('separate Hurry discard actions do not stack, while Hs discarded together do',()=>{
 const s=ready();s.bonusDiscard=1;s.hands[0]=[c(10,'fox'),c(10,'owl'),c(10,'fox',1),c(4,'hare'),c(5,'toad')];
 let next=play0(s,'bonus-discard',{ids:[c(10,'fox').id]});assert.equal(next.hurryDraw[1],1);
 next=play0(next,'discard',{ids:[c(10,'owl').id,c(10,'fox',1).id]});assert.equal(next.hurryDraw[1],2);
});

test('dragging the first discard puts it in the pile immediately and resolves effects with the second card',()=>{
 const s=ready();s.hands[0]=[c(10,'fox'),c(6,'owl'),c(2,'hare'),c(3,'toad')];
 let next=play0(s,'stage-discard',{ids:[c(10,'fox').id],pileIndex:0});assert.equal(next.hands[0].some(card=>card.id===c(10,'fox').id),false);assert.equal(next.discardPiles[0].at(-1).id,c(10,'fox').id);assert.equal(next.pendingDiscard.ids.length,1);assert.equal(next.turn,0);assert.equal(next.hurryDraw[1],0);assert.equal(next.discardPiles[0].at(-1).discardEffect,undefined);
 next=play0(next,'field-play',{ids:[c(6,'owl').id],move:{type:'discard'}});assert.equal(next.pendingDiscard,null);assert.equal(next.turn,1);assert.equal(next.hurryDraw[1],1);assert.equal(next.discardPiles[0].at(-1).protected,true);assert.equal(next.discardPiles[0].at(-1).discardEffect,'Hurry');assert.equal(next.hands[0].some(card=>card.id===c(10,'fox').id),false);
});

test('Hunt sets and Escape runs enforce their role, suit-family and minimum-size rules',()=>{
 const pair=[c(7,'fox'),c(7,'owl')],triple=[...pair,c(7,'fox',1)],run=[c(4,'hare'),c(5,'hare'),c(6,'hare')];
 assert.ok(resolveHuntEscapeMeld(pair,{role:'hunt'}));assert.equal(resolveHuntEscapeMeld(pair,{role:'escape'}),null);assert.equal(resolveHuntEscapeMeld(run,{role:'hunt'}),null);assert.ok(resolveHuntEscapeMeld(run,{role:'escape'}));assert.equal(resolveHuntEscapeMeld([c(4,'hare'),c(5,'toad'),c(6,'hare')],{role:'escape'}),null);
 const sameAnimalPair=[c(7,'owl',0),c(7,'owl',1)],sameAnimalTriple=[...sameAnimalPair,c(7,'owl',2)];
 assert.ok(resolveHuntEscapeMeld(sameAnimalPair,{role:'hunt'}));assert.ok(resolveHuntEscapeMeld(sameAnimalTriple,{role:'hunt'}));assert.ok(resolveHuntEscapeMeld([c(7,'owl',0),c(7,'fox',0)],{role:'hunt'}));assert.equal(resolveHuntEscapeMeld([c(7,'owl',0),c(8,'owl',1)],{role:'hunt'}),null);
 assert.ok(resolveMeld(triple,{rules:{variant:'hunt-escape',hunterSuits:['fox','owl'],preySuits:['hare','toad'],deckCount:4},role:'hunt'}));
});

test('Quench gives the next player exactly four cleanses however many Qs were cleansed',()=>{
 const s=ready();s.hands[0]=[c(12,'fox'),c(12,'owl'),c(4,'hare'),c(5,'toad')];const next=play0(s,'discard',{ids:[c(12,'fox').id,c(12,'owl').id]});assert.equal(next.quenchCount,undefined);assert.equal(next.discardRequired,4);assert.equal(next.turn,1);
});

test('Blaze draws one immediately and ends the turn; Arise returns its Ace',()=>{
 const blaze=ready();blaze.hands[0]=[c(11,'fox'),c(4,'owl'),c(5,'hare'),c(6,'toad')];const stock=blaze.stock.length;let next=play0(blaze,'discard',{ids:[c(11,'fox').id,c(4,'owl').id]});assert.equal(next.turn,1);assert.equal(next.hands[0].length,3);assert.equal(next.stock.length,stock-1);assert.equal(next.discardPiles[0].at(-1).discardEffect,'Blaze');
 const arise=ready();arise.hands[0]=[c(1,'fox'),c(4,'owl'),c(5,'hare'),c(6,'toad')];next=play0(arise,'discard',{ids:[c(1,'fox').id,c(4,'owl').id]});assert.ok(next.hands[0].some(card=>card.id===c(1,'fox').id&&card.effectGlow==='arise'));assert.equal(next.discardPiles.flat().some(card=>card.id===c(1,'fox').id),false);
});

test('Evoke closes a chosen face-up Pack and removes the Stalks tied to it',()=>{
 const s=ready();s.hands[0]=[c(13,'fox'),c(4,'owl'),c(5,'hare'),c(6,'toad')];s.melds=[{id:'pack',owner:1,kind:'set',rank:7,closed:false,cards:[c(7,'fox'),c(7,'owl')]},{id:'path',owner:1,kind:'run',suit:'hare',stalkedFrom:'pack',stalkedUntilTurn:99,cards:[c(4,'hare'),c(5,'hare'),c(6,'hare')]}];
 let next=play0(s,'discard',{ids:[c(13,'fox').id,c(4,'owl').id]});assert.equal(next.pendingEffect.type,'evoke');next=play(next,0,{type:'evoke',meldId:'pack'});assert.equal(next.melds[0].closed,true);assert.equal(next.melds[1].stalkedFrom,undefined);assert.equal(next.turn,1);
});

test('a three-card Hunt Party can Stalk a matching opposing Path',()=>{
 const s=ready();s.roles[0]='hunt';s.hands[0]=[c(5,'fox'),c(5,'owl'),c(5,'fox',1),c(2,'hare'),c(4,'toad')];s.melds=[{id:'path',owner:1,kind:'run',suit:'hare',closed:false,cards:[c(4,'hare',2),c(5,'hare',2),c(6,'hare',2)]}];
 let next=play0(s,'meld',{ids:s.hands[0].slice(0,3).map(card=>card.id)});assert.equal(next.pendingEffect.type,'stalk');assert.deepEqual(next.pendingEffect.targetIds,['path']);next=play(next,0,{type:'stalk',meldId:'path'});assert.equal(next.melds[0].stalkedFrom,next.melds[1].id);assert.equal(next.stalkTracks[0],1);
});

test('a Path exposed through an opposing Pack triggers a Diversion choice',()=>{
 const s=ready();s.roles[0]='escape';s.hands[0]=[c(4,'hare'),c(5,'hare'),c(6,'hare'),c(2,'toad'),c(3,'toad')];s.melds=[{id:'pack',owner:1,kind:'set',rank:5,closed:false,cards:[c(5,'fox',2),c(5,'owl',2)]}];
 let next=play0(s,'meld',{ids:s.hands[0].slice(0,3).map(card=>card.id)});assert.equal(next.pendingEffect.type,'diversion');const handSize=next.hands[0].length;next=play(next,0,{type:'diversion',choice:'draw'});assert.equal(next.hands[0].length,handSize+2);assert.equal(next.bonusDiscard,1);assert.equal(next.pendingEffect,null);
});

test('bot recognizes a zero-card Hurry and continues without drawing',()=>{
 const s=ready();s.turn=1;s.stage='draw';s.hurryDraw[1]=2;assert.deepEqual(botAction(s),{type:'skip-hurry-draw'});
});

test('seeded Sylvan bot tables keep every card accounted for through mixed special effects',()=>{
 let seed=0x5eed;const random=()=>{seed=(seed+0x6D2B79F5)|0;let x=Math.imul(seed^seed>>>15,1|seed);x^=x+Math.imul(x^x>>>7,61|x);return((x^x>>>14)>>>0)/4294967296;};
 let emptyStockDiscardBoundary=0;const announced=new Set();
 for(let game=0;game<12;game++){
  const players=2+game%4;let s=createGame(Array.from({length:players},(_,i)=>`Bot ${i+1}`),{variant:'hunt-escape'},random);
  for(let move=0;move<1200&&s.winner===null;move++){
   const action=botAction(s);try{s=play(s,s.turn,action,random);}catch(error){if(error.message==='Keep cards in hand while the draw pool is empty.'&&s.stock.length===0&&action.type==='discard'){emptyStockDiscardBoundary++;break;}assert.fail(`Sylvan bot game ${game}, move ${move}: ${error.message}; action ${JSON.stringify(action)}`);}
   for(const effect of [...(s.turnAnnouncement?.nextEffects||[]),...(s.turnAnnouncement?.selfEffects||[])])announced.add(effect);
   const cards=[...s.hands.flat(),...s.stock,...(s.discardPiles||[]).flat(),...s.melds.flatMap(m=>m.cards)];assert.equal(cards.length,216,`card count at game ${game}, move ${move}`);assert.equal(new Set(cards.map(card=>card.id)).size,216,`duplicate card at game ${game}, move ${move}`);
  }
 }
 assert.deepEqual([...announced].sort(),['Arisen','Blazed','Evoked','Hurried','Quenched'],'the seeded run should exercise every turn-end effect');
});

test('a cleanse cannot empty the hand while the draw pool is empty',()=>{
 const s=ready();s.stock=[];s.discardPiles=[[],[]];s.hands[0]=[c(4,'hare'),c(6,'toad')];
 assert.throws(()=>play0(s,'discard',{ids:s.hands[0].map(card=>card.id)}),/Keep cards in hand while the draw pool is empty/);
 s.hands[0]=[c(1,'hare'),c(6,'toad')];assert.equal(play0(s,'discard',{ids:s.hands[0].map(card=>card.id)}).hands[0].length,1,'an Arisen Ace keeps the hand alive');
});
