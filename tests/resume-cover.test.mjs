import {test} from 'vitest';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('continuation waiting cover has no hand reveal while hot-seat keeps its reveal button',async()=>{
 const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const styles=await readFile(new URL('../public/simple-cards.css',import.meta.url),'utf8');
 const resume=app.match(/function resumeOverlay\(\)[^\n]*/)?.[0]||'';
 assert.ok(resume.includes('resume-screen'));
 assert.doesNotMatch(resume,/Show my hand|Show my rack|id="reveal"/);
 assert.match(app,/class="pass-screen"><div><span class="eyebrow">PASS THE SCREEN<\/span>[\s\S]*?id="reveal" class="primary">Show my hand/);
 assert.match(app,/class="pass-screen"><div><span class="eyebrow">PASS THE SCREEN<\/span>[\s\S]*?id="reveal" class="primary">Show my rack/);
 assert.match(styles,/#app \.resume-screen #reveal\{display:none!important\}/);
});
