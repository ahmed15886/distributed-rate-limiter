const fs = require('fs');
const path = require('path');
const { client } = require('./redisClient');

const { createCircuitBreaker, canAttempt, recordSuccess, recordFailure } = require('./circuitBreaker');

const breaker = createCircuitBreaker(3, 10000);

const FAIL_MODE = process.env.FAIL_MODE || 'open';


function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Redis timeout')), ms)
    )
  ]);
}

const tokenBucketScript = fs.readFileSync(
  path.join(__dirname, 'lua', 'tokenBucket.lua'),
  'utf8'
);

async function tokenBucketAllow(key, capacity, refillRate) {
  if (!canAttempt(breaker)) {
    return {
      allowed: FAIL_MODE === 'open',
      remaining: 0,
      degraded: true,
      circuitState: breaker.state
    };
  }

  const now = Date.now();
  try {
    const result = await withTimeout(client.eval(tokenBucketScript, {
      keys: [key],
      arguments: [String(capacity), String(refillRate), String(now)]
    }),
    200
  );
    recordSuccess(breaker);
    return {
      allowed: result[0] === 1,
      remaining: result[1],
      degraded: false,
      circuitState: breaker.state
    };
  } catch (err) {
    recordFailure(breaker);
    return {
      allowed: FAIL_MODE === 'open',
      remaining: 0,
      degraded: true,
      circuitState: breaker.state
    };
  }
}

const fixedWindowScript = fs.readFileSync(
  path.join(__dirname, 'lua', 'fixedWindow.lua'),
  'utf8'
);

async function fixedWindowAllow(key, limit, windowSize) {
  if (!canAttempt(breaker)) {
    return {
      allowed: FAIL_MODE === 'open',
      remaining: 0,
      degraded: true,
      circuitState: breaker.state
    };
  }

  const now = Date.now();
  try {
    const result = await withTimeout(
      client.eval(fixedWindowScript, {
        keys: [key],
        arguments: [String(limit), String(windowSize), String(now)]
      }),
      200
    );
    recordSuccess(breaker);
    return {
      allowed: result[0] === 1,
      remaining: result[1],
      degraded: false,
      circuitState: breaker.state
    };
  } catch (err) {
    recordFailure(breaker);
    return {
      allowed: FAIL_MODE === 'open',
      remaining: 0,
      degraded: true,
      circuitState: breaker.state
    };
  }
}


const slidingWindowScript = fs.readFileSync(
  path.join(__dirname,'lua', 'slidingWindow.lua'),
  'utf8'
);

async function slidingWindowAllow(key, limit, windowSize) {
  if (!canAttempt(breaker)) {
    return {
      allowed: FAIL_MODE === 'open',
      remaining: 0,
      degraded: true,
      circuitState: breaker.state
    };
  }

  const now = Date.now();
  try {
    const result = await withTimeout(
      client.eval(slidingWindowScript, {
        keys: [key],
        arguments: [String(limit), String(windowSize), String(now)]
      }),
      200
    );
    recordSuccess(breaker);
    return {
      allowed: result[0] === 1,
      remaining: result[1],
      degraded: false,
      circuitState: breaker.state
    };
  } catch (err) {
    recordFailure(breaker);
    return {
      allowed: FAIL_MODE === 'open',
      remaining: 0,
      degraded: true,
      circuitState: breaker.state
    };
  }
}


module.exports = {tokenBucketAllow, fixedWindowAllow, slidingWindowAllow};