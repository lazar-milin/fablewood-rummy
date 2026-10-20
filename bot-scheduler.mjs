// One visible action per tick; repeated requests must not duplicate a bot's timer.
export function createBotScheduler({isCurrent,isBot,advance,publish,onError=()=>{},delay=2000,schedule=setTimeout,cancel=clearTimeout}){
 const pending=new Map();
 function queue(room){
  if(!isCurrent(room)||!isBot(room)){stop(room);return;}if(pending.has(room))return;
  const timer=schedule(()=>{pending.delete(room);if(!isCurrent(room)||!isBot(room))return;try{advance(room);}catch(error){onError(room,error);}publish(room);queue(room);},delay);timer?.unref?.();pending.set(room,timer);
 }
 function stop(room){if(pending.has(room)){cancel(pending.get(room));pending.delete(room);}}
 return {queue,stop};
}
