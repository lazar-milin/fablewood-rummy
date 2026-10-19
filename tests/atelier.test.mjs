import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const publicRoot=fileURLToPath(new URL('../public/',import.meta.url));
function htmlFiles(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?htmlFiles(resolve(dir,e.name)):e.name.endsWith('.html')?[resolve(dir,e.name)]:[]);}
test('every included Atelier page has a game return link and working local resources',()=>{
 const atelier=resolve(publicRoot,'atelier'),pages=htmlFiles(atelier),index=readFileSync(resolve(atelier,'index.html'),'utf8');
 const deck=JSON.parse(readFileSync(resolve(atelier,'deck.json'),'utf8')),jokers=JSON.parse(readFileSync(resolve(atelier,'jokers.json'),'utf8'));
 // Ordinary cards open through the inspector; jokers and the back have direct links.
 const linked=new Set([resolve(atelier,'index.html'),...deck.map(c=>resolve(atelier,c.file))]);
 for(const c of deck)assert.ok(index.includes(`data-inspect="${c.id}"`),`${c.id} must be reachable from the inspector`);
 for(const [,url]of index.matchAll(/href="([^"?#]+\.html)"/g))linked.add(resolve(atelier,url));
 for(const c of jokers)assert.ok(linked.has(resolve(atelier,c.file)),c.id);
 assert.deepEqual([...linked].sort(),pages.sort(),'every served Atelier page must be linked from the collection or its inspector');
 for(const page of pages){
  const html=readFileSync(page,'utf8');assert.ok(html.includes('Back to the game'),page);
  for(const [,url]of html.matchAll(/(?:src|href)="([^"]+)"/g)){
   if(/^(#|https?:|data:|mailto:)/.test(url))continue;
   const pathname=decodeURIComponent(url.split(/[?#]/)[0]);
   const path=pathname.startsWith('/')?resolve(publicRoot,'.'+pathname):resolve(dirname(page),pathname);
   assert.ok(existsSync(path),`${page}: ${url}`);
  }
 }
});

test('all stylesheet resources resolve and fonts use their shared public URLs',()=>{
 function cssFiles(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?cssFiles(resolve(dir,e.name)):e.name.endsWith('.css')?[resolve(dir,e.name)]:[]);}
 for(const file of cssFiles(publicRoot))for(const [,raw]of readFileSync(file,'utf8').matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g)){
  if(/^(data:|https?:|#)/.test(raw))continue;
  const pathname=decodeURIComponent(raw.split(/[?#]/)[0]);
  const target=pathname.startsWith('/')?resolve(publicRoot,'.'+pathname):resolve(dirname(file),pathname);
  assert.ok(existsSync(target),`${file}: ${raw}`);
  if(pathname.endsWith('.ttf'))assert.ok(pathname.startsWith('/fonts/'),`${file}: font must share the canonical URL`);
 }
});
