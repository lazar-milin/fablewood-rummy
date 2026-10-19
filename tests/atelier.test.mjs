import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const publicRoot=fileURLToPath(new URL('../public/',import.meta.url));
function htmlFiles(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?htmlFiles(resolve(dir,e.name)):e.name.endsWith('.html')?[resolve(dir,e.name)]:[]);}
test('every included Atelier page has a game return link and working local resources',()=>{
 const pages=htmlFiles(resolve(publicRoot,'atelier'));assert.ok(pages.length>=60);
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
