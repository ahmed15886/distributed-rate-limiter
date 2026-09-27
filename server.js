const express = require('express');
const {createBucket, allowRequest} = require('./tokenBucket');
const {createWindow, allowRequest: allowWindowRequest } = require('./fixedWindow');
const { createSlidingWindow, allowRequest: allowSlidingRequest } = require('./slidingWindow');
const {client, connectRedis } = require('./redisClient');
const { tokenBucketAllow, fixedWindowAllow, slidingWindowAllow} = require('./redisRateLimiter');

const app = express();
const PORT = process.env.PORT || 3000;
// Create one bucket per server instance for now
// (we'll move this to Redis later)
const bucket = createBucket(10,1); // 10 tokens, refill 1/sec
const window = createWindow(10, 60000); // 10 requests per 60 seconds
const slidingWindow = createSlidingWindow(10, 60000);

app.get('/api/token-bucket', (req, res)=> {
  const result = allowRequest(bucket);
  if(result.allowed){
    res.status(200).json({
      message: 'Request allowed',
      remaining: result.remaining
    });
  }
  else{
    res.status(429).json({
      message: 'Too many requests',
      remaining: result.remaining
    });
  }
});

app.get('/api/fixed-window', (req, res)=> {
  const result = allowWindowRequest(window);
  if(result.allowed){
    res.status(200).json({
      message: 'Request allowed',
      remaining: result.remaining
    });
  }
  else{
    res.status(429).json({
      message: 'Too many requests',
      remaining: result.remaining
    });
  }
});


app.get('/api/sliding-window', (req, res) => {
  const result = allowSlidingRequest(slidingWindow);

  if (result.allowed) {
    res.status(200).json({
      message: 'Request allowed',
      remaining: result.remaining
    });
  } else {
    res.status(429).json({
      message: 'Too many requests',
      remaining: result.remaining
    });
  }
});


app.get('/api/redis/token-bucket', async (req, res) => {
  try {
    const result = await tokenBucketAllow('rate:global', 10, 1);
    if (result.allowed) {
      res.status(200)
        .set('X-Served-By', `port-${PORT}`)
        .json({ message: 'Request allowed', remaining: result.remaining });
    } else {
      res.status(429)
        .set('X-Served-By', `port-${PORT}`)
        .json({ message: 'Too many requests', remaining: result.remaining });
    }
  } catch (err) {
    console.error('Rate limiter error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});


app.get('/api/redis/fixed-window', async (req, res) => {
  try {
    const result = await fixedWindowAllow('rate:fixed:global', 10, 60000);
    if (result.allowed) {
      res.status(200).json({ message: 'Request allowed', remaining: result.remaining });
    } else {
      res.status(429).json({ message: 'Too many requests', remaining: result.remaining });
    }
  } catch (err) {
    console.error('Rate limiter error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/redis/sliding-window', async (req, res) => {
  try {
    const result = await slidingWindowAllow('rate:sliding:global', 10, 60000);
    if (result.allowed) {
      res.status(200).json({ message: 'Request allowed', remaining: result.remaining });
    } else {
      res.status(429).json({ message: 'Too many requests', remaining: result.remaining });
    }
  } catch (err) {
    console.error('Rate limiter error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});


async function startServer() {
  try {
    await connectRedis();
  } catch (err) {
    console.error('Redis unavailable at startup, continuing in degraded mode');
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
startServer();