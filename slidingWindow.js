module.exports = {createSlidingWindow, allowRequest};

function createSlidingWindow(limit,windowSize){
  return{
    limit: limit,
    windowSize: windowSize,
    timestamps: []
  };
}

function allowRequest(window){
  const now = Date.now();
  while(window.timestamps.length > 0 && now-window.timestamps[0] >=  window.windowSize)
    window.timestamps.shift();
  if(window.timestamps.length < window.limit){
    window.timestamps.push(now);
    return {allowed: true, remaining: window.limit-window.timestamps.length};
  }
  else{
    return {allowed: false, remaining: window.limit-window.timestamps.length};
  }
}