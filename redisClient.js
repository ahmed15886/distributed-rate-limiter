const redis = require('redis')
const client = redis.createClient({
  host: 'localhost',
  port: '6379'
});

client.on('error', (err) => {
  console.error('Redis error:', err);
});

async function connectRedis() {
  if(!client.isOpen){
    await client.connect();
    console.log('Connected to Redis');
  }
}

connectRedis();

module.exports = {client, connectRedis};