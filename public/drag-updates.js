// Coalesce table views while a pointer owns the hand, then apply the newest one.
export function createDragUpdates({isDragging,apply}){
 let pending=null;
 return {defer(view){if(!isDragging())return false;if(!pending||view.code!==pending.code||view.revision>pending.revision)pending=view;return true;},flush(){const view=pending;pending=null;if(view)apply(view);},clear(){pending=null;}};
}
