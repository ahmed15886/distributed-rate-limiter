function createBucket(capacity, refillRate){
  return {
    capacity: capacity,
    tokens: capacity,
    refillRate: refillRate,
    lastRefill: Date.now()
  };
}

function allowRequest(bucket){
  const now = Date.now();
  const elapsedTime = (now - bucket.lastRefill) / 1000;
  const tokensToAdd = elapsedTime * bucket.refillRate;
  bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;

  if(bucket.tokens >= 1){
    bucket.tokens -= 1;
    return {allowed: true, remaining: Math.floor(bucket.tokens)};
  }
  else{
    return {allowed: false, remaining: Math.floor(bucket.tokens)};
  }
}