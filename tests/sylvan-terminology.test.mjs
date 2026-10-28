import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createGame,play,botAction} from '../public/engine.js';

const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
const css=await readFile(new URL('../public/hunt-escape.css',import.meta.url),'utf8');
const readme=await readFile(new URL('../README.md',import.meta.url),'utf8');
// Internal identifiers and protocol names keep "discard" for saved-state and network compatibility.
const identifiers=/[A-Za-z]*Discard[A-Za-z]*|discard[A-Z][A-Za-z]*|'(?:discard|stage-discard|bonus-discard|first-discard)'|(?:special|hunt|protected|cleanse)-discard[-a-z]*|discard-(?:\$\{|0|1)|data-drop-discard|id="discard"|hunt-bonus-discard|(?<![ A-Za-z])discarded\b|\.discard\b|discard:\[\]|discard=>discard/g;
const words=text=>text.replace(identifiers,'').match(/discard/gi)||[];

test('Sylvan Trail screens, help and errors say cleanse instead of discard',()=>{
 const game=app.slice(app.indexOf('function huntEscapeGame(){'),app.indexOf('\nfunction game(){'));
 const rules=app.slice(app.indexOf('function huntEscapeRulesSummary'),app.indexOf('\nfunction huntEscapeSettings'));
 const drop=app.slice(app.indexOf("if(room.options.variant==='hunt-escape'&&target.type==='discard'"),app.indexOf(' if(source.single){'));
 const summary=app.match(/variant==='hunt-escape'\)return `Sylvan Trail[^`]*`/)[0];
 for(const [name,text] of Object.entries({game,rules,drop,summary}))assert.deepEqual(words(text),[],name);
 assert.match(game,/>\$\{status\}<\/small>/);assert.match(game,/status=top\?\.protected\?'Protected':'Cleanse'/);
 assert.match(game,/'End turn without cleansing →'/);assert.match(game,/>Cleanse 1 for Diversion →<\/button>/);
 assert.match(readme,/Sylvan Trail uses the simple animal cards/);assert.doesNotMatch(readme.slice(0,readme.indexOf('## Moving cards')),/discard/i);
});

test('Sylvan engine logs and player errors use cleanse wording',()=>{
 let seed=0x51a7;const random=()=>{seed=(seed+0x6D2B79F5)|0;let x=Math.imul(seed^seed>>>15,1|seed);x^=x+Math.imul(x^x>>>7,61|x);return((x^x>>>14)>>>0)/4294967296;};
 const lines=new Set();
 for(let game=0;game<4;game++){let s=createGame(['A','B','C'],{variant:'hunt-escape'},random);for(let move=0;move<400&&s.winner===null;move++){try{s=play(s,s.turn,botAction(s),random);}catch{break;}}s.log.forEach(line=>lines.add(line));}
 assert.ok(lines.size>20);assert.deepEqual([...lines].filter(line=>/discard/i.test(line)),[]);
 const s=createGame(['A','B'],{variant:'hunt-escape'},()=>0.37);const errors=[];
 for(const [player,action] of [[0,{type:'draw',source:'stock'}],[0,{type:'stage-discard',ids:[]}],[0,{type:'discard',ids:[]}],[0,{type:'bonus-discard',ids:[]}],[1,{type:'discard',ids:[]}]]){try{play(s,player,action);}catch(error){errors.push(error.message);}}
 assert.equal(errors.length,5);assert.deepEqual(errors.filter(message=>/discard/i.test(message)),[]);
});

test('Arisen returns, suit palettes and Cleanse labels reach the Sylvan UI',()=>{
 assert.match(app,/newCards\?\.arisen\?\.includes\(c\.id\)\?'Returned · <span class="card-origin-effect origin-arisen">Arisen<\/span>':'Returned'/);
 assert.match(app,/rememberFieldReturns\(room,next\);rememberAriseReturns\(room,next\);/);
 assert.match(app,/function sylvanMeldPalette\(m\)\{[^}]*return m\.kind==='run'\?m\.suit\|\|suits\[0\]:suits\.length===1\?suits\[0\]:'hunter';\}/);
 assert.match(app,/class="hunt-meld-type \$\{m\.closed\?'hunt-fleeing-tag':'meld-suit-'\+sylvanMeldPalette\(m\)\}"/);
 for(const suit of ['fox','owl','hunter'])assert.match(css,new RegExp(`\\.hunt-meld-type\\.meld-suit-${suit}\\{`));
 for(const suit of ['hare','toad'])assert.match(css,new RegExp(`\\.path-meld \\.hunt-meld-type\\.meld-suit-${suit}\\{`));
 assert.match(css,/\.card-origin-effect\.origin-arisen\{[^}]*background:#183b2c;color:#c5ffd1;/);
});
