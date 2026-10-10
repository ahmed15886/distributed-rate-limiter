// DELIBERATELY UNSAFE. Do not use this as a rate limiter.
//
// Same token bucket logic as lua/tokenBucket.lua, but the read, the
// calculation and the write are separate steps instead of one atomic script.
// State is still shared in Redis, so the only thing missing is atomicity.
// Concurrent requests can all read the same token count before any of them
// writes back, so more requests get through than the limit allows.

const { client } = require('./redisClient');

async function unsafeTokenBucketAllow(key, capacity, refillRate) {
  const now = Date.now();

  // Step 1: read (other requests can read the same values here)
  const [storedTokens, storedLastRefill] = await client.hmGet(key, ['tokens', 'lastRefill']);
  const tokens = storedTokens !== null ? Number(storedTokens) : capacity;
  const lastRefill = storedLastRefill !== null ? Number(storedLastRefill) : now;

  // Step 2: calculate in JavaScript
  const elapsed = (now - lastRefill) / 1000;
  let newTokens = Math.min(capacity, tokens + elapsed * refillRate);

  let allowed = false;
  if (newTokens >= 1) {
    newTokens = newTokens - 1;
    allowed = true;
  }

  // Step 3: write (overwrites whatever other requests wrote in between)
  await client.hSet(key, { tokens: String(newTokens), lastRefill: String(now) });
  await client.expire(key, 3600);

  return { allowed, remaining: Math.floor(newTokens) };
}

module.exports = { unsafeTokenBucketAllow };
