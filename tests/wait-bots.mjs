export async function waitForHumans(api,code,token,result){
 result ||= await api('state?code='+code,null,token);
 for(let i=0;i<40&&result.value.state?.winner===null&&result.value.seatTypes[result.value.state.turn]==='bot';i++)result=await api('state?code='+code+'&since='+result.value.revision,null,token);
 return result;
}
