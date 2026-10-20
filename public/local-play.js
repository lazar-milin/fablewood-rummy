// Local play shares hands only when several humans use the same device.
export function sharedLocalHands(room){return room?.mode==='local'&&room.seatTypes.filter(type=>type==='human').length>1;}
export function localPlayer(room){return sharedLocalHands(room)?room.dealDecision?.player??room.state.turn:room.you;}
export function needsLocalPass(room){return !!(sharedLocalHands(room)&&room.state&&room.state.winner===null&&(room.dealDecision||room.seatTypes[room.state.turn]==='human'));}
