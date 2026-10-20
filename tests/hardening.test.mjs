import test,{before,after} from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {once} from 'node:events';import http from 'node:http';import net from 'node:net';import {networkInterfaces} from 'node:os';import {readFileSync,readdirSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
const port=3019,publicDir=new URL('../public/',import.meta.url);let child,startup='';
const get=(path,headers={})=>new Promise((resolve,reject)=>{http.get({host:'127.0.0.1',port,path,headers},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));}).on('error',reject);});
const post=async(endpoint,raw,token)=>{if(token){const body=JSON.parse(raw),state=await fetch(`http://127.0.0.1:${port}/api/state?code=${body.code}`,{headers:{Authorization:'Bearer '+token}}).then(r=>r.json());raw=JSON.stringify({revision:state.revision,...body});}const r=await fetch(`http://127.0.0.1:${port}/api/${endpoint}`,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:raw});return {status:r.status,headers:r.headers,value:await r.json()};};
const find=ext=>readdirSync(publicDir,{recursive:true}).find(f=>f.endsWith(ext));
before(async()=>{const env={...process.env,PORT:String(port)};delete env.HOST;delete env.RENDER;child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env,stdio:['ignore','pipe','pipe']});const [data]=await Promise.race([once(child.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Server startup timeout')),7000).unref())]);startup=String(data);});
after(()=>child.kill());
test('the server listens only on this computer unless HOST says otherwise',async t=>{
 assert.match(startup,new RegExp(`http://127\\.0\\.0\\.1:${port}`));
 const lan=Object.values(networkInterfaces()).flat().find(a=>a.family==='IPv4'&&!a.internal);if(!lan)return t.skip('no network address to try');
 await assert.rejects(new Promise((resolve,reject)=>{const socket=net.connect(port,lan.address,()=>{socket.destroy();resolve();}).on('error',reject);}),{code:'ECONNREFUSED'});
});
test('players see their own mistakes but not internal errors',async()=>{
 for(const raw of ['null','{','[]'])assert.deepEqual((await post('state',raw)).value,{error:'Bad request.'},raw);
 const created=(await post('create','{"name":"Host"}')).value,code=created.room.code,host=created.token;
 const guest=(await post('join',JSON.stringify({code,name:'Guest'}))).value.token;await post('start',JSON.stringify({code}),host);
 const turn=await post('action',JSON.stringify({code,action:{type:'draw',source:'stock'}}),guest);assert.equal(turn.status,400);assert.equal(turn.value.error,'It is not your turn.');
 const crash=await post('action',JSON.stringify({code}),host);assert.equal(crash.status,500);assert.deepEqual(crash.value,{error:'Something went wrong. Try again.'});
 const uri=await get('/%E0%A4%A');assert.equal(uri.status,400);assert.doesNotMatch(String(uri.body),/URI|malformed/);
});
test('static files carry their content type and nosniff',async()=>{
 const files=[['/','text/html; charset=utf-8'],['/app.js','text/javascript; charset=utf-8'],['/style.css','text/css; charset=utf-8'],['/art/card-kit/assets/heads/fox-head.svg','image/svg+xml'],['/'+find('.ttf'),'font/ttf'],['/'+find('.json'),'application/json; charset=utf-8'],['/'+find('.txt'),'text/plain; charset=utf-8'],['/'+find('.csv'),'text/plain; charset=utf-8']];
 for(const [path,type]of files){if(path==='/undefined')continue;const r=await get(path);assert.equal(r.status,200,path);assert.equal(r.headers['content-type'],type,path);assert.equal(r.headers['x-content-type-options'],'nosniff',path);}
 assert.equal((await get('/missing.txt')).headers['x-content-type-options'],'nosniff');
 assert.equal((await post('create','{}')).headers.get('x-content-type-options'),'nosniff');
});
test('art is cached and compressed, while code is revalidated on every load',async()=>{
 const path='/art/card-kit/assets/heads/fox-head.svg',file=readFileSync(new URL('.'+path,publicDir)),zipped=await get(path,{'Accept-Encoding':'gzip, deflate'});
 assert.equal(zipped.headers['content-encoding'],'gzip');assert.deepEqual(gunzipSync(zipped.body),file);assert.match(zipped.headers.vary,/Accept-Encoding/);
 assert.match(zipped.headers['cache-control'],/max-age=\d{6,}/);assert.ok(zipped.headers.etag);
 const plain=await get(path);assert.equal(plain.headers['content-encoding'],undefined);assert.deepEqual(plain.body,file);assert.equal(plain.headers.etag,zipped.headers.etag);
 const again=await get(path,{'If-None-Match':zipped.headers.etag});assert.equal(again.status,304);assert.equal(again.body.length,0);
 const code=await get('/app.js',{'Accept-Encoding':'gzip'});assert.equal(code.headers['cache-control'],'no-cache');assert.equal(code.headers['content-encoding'],'gzip');
 assert.equal((await get('/app.js',{'If-None-Match':code.headers.etag})).status,304);
});
// Runs last: it spends this address's allowance for the minute.
test('API requests over the per-minute limit get 429',async()=>{
 let ok=0;for(let batch=0;batch<18;batch++)ok+=(await Promise.all(Array.from({length:100},()=>fetch(`http://127.0.0.1:${port}/api/tables`).then(r=>r.arrayBuffer().then(()=>r.status))))).filter(s=>s===200).length;
 assert.ok(ok>=1750&&ok<=1800,`${ok} requests allowed`);
 const limited=await fetch(`http://127.0.0.1:${port}/api/tables`,{headers:{'X-Forwarded-For':'203.0.113.7'}});assert.equal(limited.status,429,'X-Forwarded-For is ignored unless TRUST_PROXY is set');assert.equal(limited.status,429);assert.deepEqual(await limited.json(),{error:'Too many requests. Try again shortly.'});
 assert.equal((await get('/app.js')).status,200,'pages and art are not limited');
});
