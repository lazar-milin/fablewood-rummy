import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createGame} from '../public/engine.js';
import {cardMarkup,cardBackMarkup,setSimpleCards,setCardVariant} from '../public/card-art.js';

const suits=['fox','hare','toad','owl'];
const simpleCss=await readFile(new URL('../public/simple-cards.css',import.meta.url),'utf8');

test('official simple faces use the HI-VIS design and matching grim suit markers',()=>{
 try{
  setCardVariant('remi51');setSimpleCards(true);
  for(const suit of suits)for(let rank=1;rank<=13;rank++){
   const html=cardMarkup({id:`0-${suit}-${rank}`,suit,rank});
   assert.match(html,/simple-card/);assert.match(html,new RegExp(`heads/hivis/${suit}-head-hivis\\.svg`));
   assert.match(html,/simple-face-fill/);assert.match(html,/simple-rank/);
   assert.match(html,new RegExp(`frames/${suit}-capsule\\.svg`));
   assert.doesNotMatch(html,/border-motif|footer-flourish|pip-field|animal-art/);
  }
  for(const rank of [1,10,11,12,13])assert.match(cardMarkup({id:`0-fox-${rank}`,suit:'fox',rank}),new RegExp('>'+({1:'A',10:'H',11:'B',12:'Q',13:'E'}[rank])+'<'));
  for(const suit of suits){const html=cardMarkup({id:`0-${suit}-7`,suit,rank:7});assert.match(html,/simple-rank[^>]*>-?7</);}
  assert.match(simpleCss,/assets\/back\/glyph-pattern\.svg/);assert.match(simpleCss,/-webkit-text-stroke:2\.5cqw var\(--hi-ring-light\)/);
 }finally{setCardVariant('remi51');setSimpleCards(false);}
});

test('simple jokers use one HI-VIS face design for every joker identity',()=>{
 try{setCardVariant('remi51');setSimpleCards(true);const cards=Array.from({length:4},(_,i)=>cardMarkup({id:'joker-'+i,joker:true}));assert.equal(new Set(cards).size,1);assert.match(cards[0],/<span>J<\/span><span>O<\/span><span>K<\/span><span>E<\/span><span>R<\/span>/);assert.match(cards[0],/frames\/joker-capsule\.svg/);assert.match(cards[0],/simple-face-fill/);assert.match(simpleCss,/assets\/back\/glyph-pattern\.svg/);assert.equal((cards[0].match(/<img/g)||[]).length,1);assert.doesNotMatch(cards[0],/<svg|head-marker|curve-joker|dragon|griffin|phoenix|unicorn/);}
 finally{setCardVariant('remi51');setSimpleCards(false);}
});

test('switching to full artwork and card backs still restores the expected compositions',()=>{
 setCardVariant('remi51');setSimpleCards(true);cardMarkup({id:'0-fox-7',suit:'fox',rank:7});setSimpleCards(false);
 assert.match(cardMarkup({id:'0-fox-7',suit:'fox',rank:7}),/pip-field/);assert.match(cardMarkup({id:'joker-0',joker:true}),/curve-joker-dragon-joker-0/);
 assert.match(cardBackMarkup,/back-grimoire/);assert.match(cardBackMarkup,/back-surround/);
});

test('simple preference changes the shared back, while Rummikub keeps numeric HI-VIS cards by default',()=>{
 try{
  setSimpleCards(true);assert.match(cardBackMarkup,/simple-back/);assert.match(cardBackMarkup,/jokers\/moon-pixel\.svg/);assert.match(cardBackMarkup,/back\/capsule\.svg/);assert.doesNotMatch(cardBackMarkup,/back-grimoire|back-surround|botanical-surround/);
  setCardVariant('rummikub');setSimpleCards(false);const game=createGame(['Fern','Moss'],{variant:'rummikub'});
  for(const card of [...game.hands.flat(),...game.stock]){const html=cardMarkup(card);assert.match(html,/simple-card/);assert.match(html,/numeric-card/);assert.match(html,/simple-face-fill/);assert.doesNotMatch(html,/pip-field|animal-art|footer-flourish|curve-joker|back-grimoire/);if(!card.joker){assert.match(html,new RegExp(`heads/hivis/${card.suit}-head-hivis\\.svg`));assert.match(html,new RegExp(`class="simple-rank"[^>]*>${card.rank}<`));}else assert.match(html,/<span>J<\/span><span>O<\/span>/);}
  assert.match(cardBackMarkup,/simple-back/);
 }finally{setCardVariant('remi51');setSimpleCards(false);}
});

test('every official marker asset exists and simple cards default on for new browser preferences',async()=>{
 for(const suit of suits){const svg=await readFile(new URL(`../public/art/card-kit/assets/heads/hivis/${suit}-head-hivis.svg`,import.meta.url),'utf8');assert.match(svg,/<svg/);if(suit!=='toad')assert.match(svg,/stroke-linejoin="round"/);else{assert.match(svg,/feGaussianBlur in="expanded" stdDeviation="18"/);assert.match(svg,/flood-color="#FFF9E6"/);}}
 const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');assert.match(app,/forest-simple-cards'\)!=='false'/);
});
