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

module.exports = { tokenBucketAllow };