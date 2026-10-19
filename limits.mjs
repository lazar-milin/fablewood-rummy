// Server housekeeping, kept out of server.mjs so it can be tested without a running server.
export const TABLE_IDLE_MS=24*60*60*1000;
// Counts each address's requests in fixed windows; an address quiet for two windows is forgotten.
export function rateLimiter(limit,windowMs){
 const counts=new Map();
 return {
  allow(ip,now=Date.now()){let c=counts.get(ip);if(!c||now-c.start>=windowMs)counts.set(ip,c={start:now,n:0});return ++c.n<=limit;},
  sweep(now=Date.now()){for(const[ip,c]of counts)if(now-c.start>=2*windowMs)counts.delete(ip);},
  get size(){return counts.size;}
 };
}
export function expireTables(rooms,now=Date.now()){for(const[code,r]of rooms)if(now-r.touched>TABLE_IDLE_MS)rooms.delete(code);}
