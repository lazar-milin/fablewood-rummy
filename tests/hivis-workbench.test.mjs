import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('workbench contains every Classic and Rummikub face grouped by suit',async()=>{
 const page=await readFile(new URL('../public/hivis-workbench.html',import.meta.url),'utf8');
 const css=await readFile(new URL('../public/simple-cards.css',import.meta.url),'utf8');
 assert.match(page,/href="\/card-art\.css"/);assert.match(page,/href="\/simple-cards\.css\?v=hivis-official/);
 assert.match(page,/Draggable card workbench/);assert.match(page,/background:#777b7b/);
 assert.match(page,/suits=\['fox','hare','toad','owl'\]/);assert.match(page,/length:13/);
 assert.match(page,/makeEdition\('remi51','Classic Rummy'\)\+makeEdition\('rummikub','Rummikub'\)/);
 assert.match(page,/jokerCount=variant==='rummikub'\?2:4/);assert.match(page,/cardBackMarkup/);
 assert.match(page,/data-card="\$\{card\.id\}"/);assert.match(page,/setCardVariant\(variant\)/);
 assert.match(page,/addEventListener\('pointerdown'/);assert.match(page,/addEventListener\('pointermove'/);assert.match(page,/addEventListener\('pointerup'/);
 assert.match(page,/layoutFrozen=true/);assert.match(page,/querySelectorAll\('\.card-slot'\)\.forEach\(slot=>slot\.style\.position='static'\)/);assert.match(page,/overflow-x:auto/);assert.match(page,/scrollbar-width:none/);
 assert.match(css,/left:4\.583333%;top:2\.291667%;width:90\.833334%;height:95\.416666%/);
 assert.match(css,/assets\/back\/glyph-pattern\.svg/);assert.match(css,/-webkit-text-stroke:2\.5cqw var\(--hi-ring-light\)/);
 assert.match(css,/suit-fox \.simple-face-fill\{background:#CC8C65\}/);
 assert.doesNotMatch(page,/<nav\b|<header\b|<h1\b/i);
});
