import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createGame,play,PlayerError} from '../public/engine.js';
import {huntEscapeGroupPossible,huntEscapeFieldProblem,huntEscapeLayoffProblem} from '../public/hunt-escape.js';

const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
const pointer=await readFile(new URL('../public/movement-pointer.js',import.meta.url),'utf8');
const css=await readFile(new URL('../public/hunt-escape.css',import.meta.url),'utf8');
const card=(rank,suit='fox',copy=0)=>({id:`${copy}-${suit}-${rank}`,rank,suit});
const joker={id:'joker-1',joker:true,suit:'joker',rank:0};
const pack=(id,owner,rank,extra={})=>({id,owner,kind:'set',rank,closed:false,cards:[card(rank,'fox',7),card(rank,'owl',7)],...extra});
function ready(names=['A','B','C']){
 const state=createGame(names,{variant:'hunt-escape'},()=>0.37);
 state.turn=0;state.turns=names.length*2;state.stage='meld';state.roles=names.map(()=>'hunt');state.opened=names.map(()=>true);
 state.stock=Array.from({length:12},(_,i)=>card((i%9)+2,'toad',5+i));state.discardPiles=[[],[]];
 return state;
}
const allCards=s=>[...s.hands.flat(),...s.stock,...s.discardPiles.flat(),...s.melds.flatMap(m=>m.cards)];

test('an Evoked Pack keeps its Evoker internally and recycles at their next turn before the draw',()=>{
 let state=ready();state.melds=[pack('mine',0,7),pack('theirs',1,9),pack('kept',2,4)];state.melds[1].cards.push({...joker,as:{suit:'fox',rank:9}});
 state.hands[0]=[card(13,'fox',2),card(4,'owl',2),card(3,'hare',2)];state.hands[1]=[card(2,'hare',3),card(3,'toad',3),card(5,'hare',3)];state.hands[2]=[card(2,'hare',4),card(3,'toad',4),card(5,'hare',4)];
 state.hands[0].push(card(13,'owl',2));
 const total=allCards(state).length;
 state=play(state,0,{type:'discard',ids:[card(13,'fox',2).id,card(13,'owl',2).id]});
 assert.equal(state.pendingEffect.remaining,2);
 state=play(state,0,{type:'evoke',meldId:'theirs'});state=play(state,0,{type:'evoke',meldId:'mine'});
 assert.equal(state.turn,1);
 assert.deepEqual(state.melds.filter(m=>m.closed).map(m=>[m.id,m.closedBy,m.owner]),[['mine',0,0],['theirs',0,1]]);
 // Other players' turns leave the Fleeing Packs on the field.
 state.stage='meld';state=play(state,1,{type:'discard',ids:[card(2,'hare',3).id,card(3,'toad',3).id]});
 assert.equal(state.turn,2);assert.equal(state.melds.filter(m=>m.closed).length,2);
 const stockBefore=state.stock.length;
 state.stage='meld';state=play(state,2,{type:'discard',ids:[card(2,'hare',4).id,card(3,'toad',4).id]});
 assert.equal(state.turn,0);assert.equal(state.stage,'draw');
 assert.deepEqual(state.melds.map(m=>m.id),['kept'],'both Fleeing Packs leave the field before the Evoker draws');
 assert.equal(state.stock.length,stockBefore+5);
 const recycled=state.stock.find(item=>item.id==='joker-1');assert.ok(recycled);assert.equal(recycled.as,undefined);
 assert.equal(allCards(state).length,total);assert.equal(new Set(allCards(state).map(item=>item.id)).size,total);
 assert.ok(state.log.at(-1).includes('2 Fleeing Packs returned 5 cards to the pool'));
});

test('Sylvan drafts must still fit a meld the current Spirit can expose',()=>{
 assert.equal(huntEscapeGroupPossible([card(5,'fox')],'hunt'),true);
 assert.equal(huntEscapeGroupPossible([card(5,'fox'),card(5,'owl'),joker],'hunt'),true);
 assert.equal(huntEscapeGroupPossible([card(5,'fox'),card(6,'owl')],'hunt'),false);
 assert.equal(huntEscapeGroupPossible([card(5,'hare')],'hunt'),false);
 assert.equal(huntEscapeGroupPossible([card(5,'hare'),card(9,'hare'),joker],'escape'),true,'gaps may still be filled');
 assert.equal(huntEscapeGroupPossible([card(1,'hare'),card(13,'hare')],'escape'),true,'a high Ace still fits');
 assert.equal(huntEscapeGroupPossible([card(5,'hare'),card(6,'toad')],'escape'),false);
 assert.equal(huntEscapeGroupPossible([card(5,'hare'),card(5,'hare',1)],'escape'),false);
 assert.equal(huntEscapeGroupPossible([card(5,'fox')],'escape'),false);
 assert.equal(huntEscapeGroupPossible([joker,{...joker,id:'joker-2'}],'hunt'),false);
 assert.equal(huntEscapeGroupPossible([card(5,'fox')],null),false);
});

test('illegal field drops are rejected by the engine without changing state',()=>{
 const state=ready();state.hands[0]=[card(5,'fox'),card(5,'owl'),card(8,'hare'),card(9,'hare'),card(3,'toad')];
 const before=structuredClone(state);
 for(const action of [{type:'field-stage',ids:[card(8,'hare').id]},{type:'field-stage',ids:[card(5,'fox').id,card(8,'hare').id]}])
  assert.throws(()=>play(state,0,action),error=>error instanceof PlayerError&&/Hunter cards of one rank/.test(error.message));
 assert.deepEqual(state,before);
 let next=play(state,0,{type:'field-stage',ids:[card(5,'fox').id]});
 assert.throws(()=>play(next,0,{type:'field-merge',index:0,ids:[card(3,'toad').id]}),/Hunter cards of one rank/);
 next=play(next,0,{type:'field-merge',index:0,ids:[card(5,'owl').id]});
 assert.equal(next.melds.length,1,'a legal two-card Pack opens at once');
 assert.equal(huntEscapeFieldProblem(next,0,[card(9,'hare')]),'You may meld only once per turn.');
 const unset=ready();unset.roles[0]=null;unset.hands[0]=[card(5,'fox'),card(5,'owl'),card(3,'toad')];
 assert.throws(()=>play(unset,0,{type:'field-stage',ids:[card(5,'fox').id]}),/Choose your Hunt or Escape spirit/);
 const short=ready();short.hands[0]=[card(5,'fox'),card(5,'owl'),card(3,'toad')];
 assert.match(huntEscapeFieldProblem(short,0,short.hands[0].slice(0,2)),/Keep 2 cards/);
});

test('table layoffs share one legality check for targets and acceptance',()=>{
 const state=ready();state.roles[0]='escape';state.melds=[pack('pack',1,7),{id:'mine',owner:0,kind:'run',suit:'hare',closed:false,cards:[card(4,'hare',7),card(5,'hare',7),card(6,'hare',7)]},{id:'other',owner:1,kind:'run',suit:'toad',closed:false,cards:[card(4,'toad',7),card(5,'toad',7),card(6,'toad',7)]},{id:'stalked',owner:0,kind:'run',suit:'toad',closed:false,stalkedUntilTurn:99,cards:[card(8,'toad',7),card(9,'toad',7),card(10,'toad',7)]}];
 state.hands[0]=[card(7,'hare'),card(7,'fox'),card(7,'toad'),card(11,'toad'),card(2,'owl'),card(3,'owl')];
 assert.equal(huntEscapeLayoffProblem(state,0,1,[card(7,'hare')]),'');
 assert.notEqual(huntEscapeLayoffProblem(state,0,1,[card(7,'toad')]),'','wrong suit');
 assert.notEqual(huntEscapeLayoffProblem(state,0,0,[card(7,'fox')]),'','Escape cannot add to a Pack');
 assert.notEqual(huntEscapeLayoffProblem(state,0,2,[card(7,'toad')]),'','Escape adds only to its own Path');
 assert.notEqual(huntEscapeLayoffProblem(state,0,3,[card(11,'toad')]),'','a Stalked Path is closed to additions');
 const before=structuredClone(state);
 assert.throws(()=>play(state,0,{type:'layoff',index:0,ids:[card(7,'fox').id]}),/Escape can add only to your own Path/);
 const failed=play(state,0,{type:'field-play',ids:[card(7,'toad').id],move:{type:'layoff',index:1}});
 assert.deepEqual(failed.melds,before.melds,'a rejected field drop leaves the melds untouched');assert.equal(failed.meldedThisTurn,false);assert.ok(failed.fieldNotice);
 const added=play(state,0,{type:'layoff',index:1,ids:[card(7,'hare').id]});
 assert.equal(added.melds[1].cards.length,4);
});

test('a card drawn by Blaze carries its origin until it leaves the hand',()=>{
 let state=ready(['A','B']);state.hands[0]=[card(11,'fox'),card(4,'owl'),card(5,'hare'),card(6,'toad')];
 state=play(state,0,{type:'discard',ids:[card(11,'fox').id,card(4,'owl').id]});
 const blazed=state.hands[0].filter(item=>item.gainedBy==='Blaze');
 assert.equal(blazed.length,1);assert.equal(state.hands[0].length,3);
 state.turn=0;state.stage='meld';state.discardRequired=2;state.skipDiscard=false;
 state=play(state,0,{type:'discard',ids:[blazed[0].id,card(5,'hare').id]});
 assert.equal(state.discardPiles.flat().find(item=>item.id===blazed[0].id).gainedBy,undefined);
});

test('Sylvan UI gates drop targets and labels Fleeing Packs and Blazed cards',()=>{
 assert.match(pointer,/const found=locate\(e\.clientX,e\.clientY\),target=allowed\(found\)\?found:null;/);
 assert.match(pointer,/if\(!allowed\(target\)\)\{clear\(\);return;\}/);
 assert.match(app,/installCardMovement\(\{context:movementContext,allow:sylvanDropAllowed,/);
 assert.match(app,/return !huntEscapeLayoffProblem\(s,p,target\.index,cards\);/);
 assert.match(app,/target\.type==='replace'&&room\.options\.variant!=='hunt-escape'\?\{type:'replace'/);
 assert.match(app,/label=m\.closed\?'Fleeing!':/);
 assert.match(app,/\$\{m\.closed\?'':`<span class="hunt-meld-signature">/);
 assert.match(app,/c\.gainedBy==='Blaze'\?'New · <span class="card-origin-effect origin-blazed">Blazed<\/span>':'New'/);
 assert.match(css,/\.hunt-meld-type\.hunt-fleeing-tag\{color:#ff7d7d;/);
 assert.match(css,/\.card-origin-effect\.origin-blazed\{color:#ffd09c;/);
});
