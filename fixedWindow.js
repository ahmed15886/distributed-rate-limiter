module.exports = {createWindow, allowRequest};

function createWindow(limit, windowSize){
  return{
    limit: limit,
    windowSize: windowSize,
    windowStart: Date.now(),
    requestCount: 0
  };
}

function allowRequest(window){
  const now = Date.now();
  const windowExpired = (now-window.windowStart) >= window.windowSize;
  
  if(windowExpired){
    window.windowStart=now;
    window.requestCount=1;
    return {allowed: true, remaining: window.limit-1}
  }

  if(window.requestCount<window.limit){
    window.requestCount +=1;
    return {allowed:true, remaining: window.limit - window.requestCount};
  }
  else{
    return {allowed:false, remaining: window.limit - window.requestCount};
  }
}