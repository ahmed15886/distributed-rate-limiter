const express = require('express');
const {createBucket, allowRequest} = require('./tokenBucket');

const app = express();
const PORT = 3000;

// Create one bucket per server instance for now
// (we'll move this to Redis later)
const bucket = createBucket(10,1); // 10 tokens, refill 1/sec

app.get('/api/data', (req, res)=> {
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
      remaining: bucket.remaining
    });
  }
});

app.listen(PORT , () => {
  console.log(`Server running on port ${PORT}`);
});