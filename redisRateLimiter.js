const fs = require('fs');
const path = require('path');
const { client } = require('./redisClient');

const tokenBucketScript = fs.readFileSync(
  path.join(__dirname, 'lua', 'tokenBucket.lua'),
  'utf8'
);

async function tokenBucketAllow(key, capacity, refillRate) {
  const now = Date.now();
  const result = await client.eval(tokenBucketScript, {
    keys: [key],
    arguments: [
      String(capacity),
      String(refillRate),
      String(now)
    ]
  });

  return {
    allowed: result[0] === 1,
    remaining: result[1]
  };
}

const fixedWindowScript = fs.readFileSync(
  path.join(__dirname, 'lua', 'fixedWindow.lua'),
  'utf8'
);

async function fixedWindowAllow(key, limit, windowSize) {
  const now = Date.now();
  const result = await client.eval(fixedWindowScript, {
    keys: [key],
    arguments: [
      String(limit),
      String(windowSize),
      String(now)
    ]
  });

  return {
    allowed: result[0] === 1,
    remaining: result[1]
  };
}

const slidingWindowScript = fs.readFileSync(
  path.join(__dirname,'lua', 'slidingWindow.lua'),
  'utf8'
);

async function slidingWindowAllow(key, limit, windowSize){
  const now = Date.now();
  const result = await client.eval(slidingWindowScript, {
    keys: [key],
    arguments: [
      String(limit),
      String(windowSize),
      String(now)
    ]
  });
  return {
    allowed: result[0] === 1,
    remaining: result[1]
  }

}


module.exports = {tokenBucketAllow, fixedWindowAllow, slidingWindowAllow};