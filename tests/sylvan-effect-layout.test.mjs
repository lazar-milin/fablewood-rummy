import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const css = await readFile(new URL('../public/hunt-escape.css', import.meta.url), 'utf8');
const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');

test('Sylvan discard piles reserve fixed label and effect-stack space', () => {
 assert.match(css, /\.hunt-pile small\{[^}]*height:31px;[^}]*min-height:31px/s);
 assert.match(css, /\.hunt-pile \.hunt-effect-stack\{[^}]*height:88px;[^}]*min-height:88px/s);
 assert.match(app, /<div class="hunt-effect-stack" aria-hidden="true"><\/div>/);
});

test('Sylvan effect indicators compact after the fourth row without growing the reserved stack', () => {
 assert.match(css, /\.hunt-effect-stack:has\(>:nth-child\(5\)\)\{gap:1px\}/);
 assert.match(css, /\.hunt-effect-stack:has\(>:nth-child\(5\)\)>\*\{flex-basis:15px/);
});
