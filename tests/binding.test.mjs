import {test} from 'vitest';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {networkInterfaces} from 'node:os';

async function start(t,settings){
 const env={...process.env,PORT:'0'};delete env.HOST;delete env.RENDER;Object.assign(env,settings);
 const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env,stdio:['ignore','pipe','pipe']});
 t.onTestFinished(async()=>{if(child.exitCode===null){const exited=once(child,'exit');child.kill();await exited;}});
 let output='',errors='';child.stderr.on('data',data=>{errors+=data;});
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Startup timed out: '+errors)),7000);
  const fail=error=>{clearTimeout(timer);reject(error);};child.once('error',fail);
  child.once('exit',code=>fail(Error('Server exited '+code+': '+errors)));
  child.stdout.on('data',data=>{output+=data;const match=output.match(/Fablewood Rummy: http:\/\/([^:]+):(\d+)/);if(match){clearTimeout(timer);resolve({address:match[1],port:Number(match[2])});}});
 });
}

test('Render binds to all IPv4 interfaces on its supplied port without HOST configuration',async t=>{
 const {address,port}=await start(t,{RENDER:'true'});assert.equal(address,'0.0.0.0');assert.ok(port>0);
 const lan=Object.values(networkInterfaces()).flat().find(a=>a.family==='IPv4'&&!a.internal);
 const response=await fetch(`http://${lan?.address||'127.0.0.1'}:${port}/`,{signal:AbortSignal.timeout(5000)});
 assert.equal(response.status,200);assert.match(await response.text(),/Fablewood Rummy/);
});

test('an explicit HOST takes precedence over Render detection',async t=>{
 const {address,port}=await start(t,{RENDER:'true',HOST:'127.0.0.1'});assert.equal(address,'127.0.0.1');
 assert.equal((await fetch(`http://127.0.0.1:${port}/`,{signal:AbortSignal.timeout(5000)})).status,200);
});

test('RENDER=false retains the local-only default',async t=>{
 const {address}=await start(t,{RENDER:'false'});assert.equal(address,'127.0.0.1');
});
