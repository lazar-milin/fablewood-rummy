import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const css = await readFile(new URL('../public/hunt-escape.css', import.meta.url), 'utf8');
const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');

test('Sylvan discard piles reserve fixed label and effect-stack space', () => {
 assert.match(css, /\.hunt-pile small\{[^}]*height:31px;[^}]*min-height:31px/s);
 assert.match(css, /\.hunt-pile \.hunt-effect-stack\{[^}]*height:88px;[^}]*min-height:88px/s);
 assert.match(app, /<div class="hunt-effect-stack" aria-label=/);
});

test('Sylvan effect indicators compact after the fourth row without growing the reserved stack', () => {
 assert.match(css, /\.hunt-effect-stack:has\(>:nth-child\(5\)\)\{gap:1px\}/);
 assert.match(css, /\.hunt-effect-stack:has\(>:nth-child\(5\)\)>\*\{flex:1 1 0;min-height:10px/);
});

test('Sylvan pool keeps the deck and both discard piles in one non-wrapping row', () => {
 assert.match(css, /\.hunt-piles\{[^}]*flex-direction:row;flex-wrap:nowrap/s);
 assert.match(css, /\.hunt-discard-piles\{[^}]*flex-direction:row;flex-wrap:nowrap/s);
 assert.match(css, /hunt-escape-game>\.board\{grid-template-columns:300px minmax\(0,1fr\)!important/s);
});

test('Sylvan meldability badges name the Pack or Path instead of showing points', () => {
 assert.match(app, /const meldableBadge=m=>'Meldable · '\+\(room\?\.options\.variant==='hunt-escape'\?\(m\.kind==='set'\?'Pack':'Path'\):m\.points\)/);
 assert.doesNotMatch(app, /'Meldable · '\+m\.points/);
 assert.match(app, /\$\{m\?meldableBadge\(m\):'Non meldable'\}/);
 assert.match(app, /\$\{m\?meldableBadge\(m\):group\?'Non meldable':'Building…'\}/);
});

test('player-tile Pack markers are orange pixel triangles', () => {
 assert.match(app, /<span class="sylvan-party-mark" aria-hidden="true">\$\{PackTriangle\}<\/span>/);
 assert.match(app, /const PackTriangle='<svg class="sylvan-pack-triangle" viewBox="0 0 7 6" shape-rendering="crispEdges"/);
 assert.doesNotMatch(app, /sylvan-party-mark" aria-hidden="true">×/);
 assert.match(css, /\.player \.sylvan-party-mark\{[^}]*color:#ff9f43/);
});

test('the Quenched hand indicator reads exactly as specified and cannot wrap', () => {
 assert.match(app, /<div class="sylvan-quench-banner" role="status">Quenched · \$\{QUENCH_CLEANSES\} cleanses · Aces lost<\/div>/);
 assert.match(css, /\.sylvan-quench-banner\{[^}]*white-space:nowrap/);
});

test('turn announcements overlay the table without capturing pointers or taking layout space', () => {
 assert.match(css, /\.turn-announcement\{position:fixed;inset:0;[^}]*justify-content:center;[^}]*pointer-events:none/);
 assert.match(css, /\.turn-announcement-row\{[^}]*justify-content:center/);
 assert.doesNotMatch(css, /\.turn-announcement\{[^}]*background/);
});

test('the player strip splits its height so the spirit and PLAYING badges both stay inside it', () => {
 assert.match(css, /#header-players\{padding:7px 2px!important\}/);
});
