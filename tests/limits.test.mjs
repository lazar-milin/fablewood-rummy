import {test} from 'vitest';import assert from 'node:assert/strict';
import {rateLimiter,expireTables} from '../limits.mjs';
test('each address may send a fixed number of requests per window',()=>{
 const limiter=rateLimiter(3,1000);
 for(let i=0;i<3;i++)assert.equal(limiter.allow('a',0),true);
 assert.equal(limiter.allow('a',999),false);assert.equal(limiter.allow('b',999),true,'other addresses keep their own count');
 assert.equal(limiter.allow('a',1000),true,'a new window starts a new count');
});
test('quiet addresses are forgotten',()=>{
 const limiter=rateLimiter(3,1000);limiter.allow('a',0);limiter.allow('b',1500);
 limiter.sweep(2500);assert.equal(limiter.size,1);limiter.sweep(4000);assert.equal(limiter.size,0);
});
test('tables expire after 24 hours without activity',()=>{
 const day=24*60*60*1000,rooms=new Map([['stale',{touched:0}],['fresh',{touched:1}]]);
 expireTables(rooms,day+1);assert.deepEqual([...rooms.keys()],['fresh']);
});
