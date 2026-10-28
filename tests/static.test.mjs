import {test} from 'vitest';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {once} from 'node:events';import http from 'node:http';
// Raw request paths: fetch() would normalize the encodings these attacks rely on.
const get=(port,path)=>new Promise((resolve,reject)=>{http.get({host:'127.0.0.1',port,path},res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>resolve({status:res.statusCode,type:res.headers['content-type'],body}));}).on('error',reject);});
test('static files are served only from public/',async()=>{
 const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'3013'},stdio:['ignore','pipe','pipe']});
 try{await Promise.race([once(child.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Server startup timeout')),7000).unref())]);
 const home=await get(3013,'/');assert.equal(home.status,200);assert.match(home.body,/Fablewood/);
 const icon=home.body.match(/<link rel="icon" type="image\/svg\+xml" href="([^"]+)"/);assert.ok(icon,'the game declares an SVG favicon');
 assert.match(icon[1],/\/heads\/toad-head\.svg$/);const favicon=await get(3013,icon[1]);assert.equal(favicon.status,200);assert.equal(favicon.type,'image/svg+xml');
 const art=await get(3013,'/art/card-kit/assets/heads/fox-head.svg');assert.equal(art.status,200);assert.equal(art.type,'image/svg+xml');
 for(const path of ['/atelier/PROMPTS.json','/atelier/VALIDATION.md','/art/card-kit/SOURCE.json','/docs/art/SOURCE.json','/docs/art/production/PROMPTS.json','/atelier/evolution-reference.html','/atelier/joker-preview.html','/atelier/ornament-preview.html','/art/card-kit/assets/fonts/alagard.ttf','/art/card-kit/assets/fonts/vcr-osd-mono.ttf'])assert.equal((await get(3013,path)).status,404,path);
 for(const name of ['alagard','vcr-osd-mono']){const font=await get(3013,`/fonts/${name}.ttf`);assert.equal(font.status,200);assert.equal(font.type,'font/ttf');}
 for(const path of ['/file:/etc/hosts','/file:///etc/hosts','/%252e%252e/server.mjs','/%252e%252e/.git/config','/%2e%2e/server.mjs','/..%2fserver.mjs','/%2fetc%2fhosts','/art/%252e%252e/%252e%252e/server.mjs','/fonts/%00']){
  const r=await get(3013,path);assert.notEqual(r.status,200,path);assert.doesNotMatch(r.body,/localhost|node:http|repositoryformatversion/,path);
 }
 }finally{child.kill();}
});
