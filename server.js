const express = require('express');
const {createBucket, allowRequest} = require('./tokenBucket');
const {createWindow, allowRequest: allowWindowRequest } = require('./fixedWindow');

const app = express();
const PORT = 3000;

// Create one bucket per server instance for now
// (we'll move this to Redis later)
const bucket = createBucket(10,1); // 10 tokens, refill 1/sec
const window = createWindow(10, 60000); // 10 requests per 60 seconds

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

app.listen(PORT , () => {
  console.log(`Server running on port ${PORT}`);
});