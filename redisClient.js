const redis = require('redis');

const client = redis.createClient({
  socket: {
    host: '127.0.0.1',
    port: 6379,
    connectTimeout: 500,
    reconnectStrategy: (retries) => Math.min(retries * 200, 2000)
  }
});

client.on('ready', () => console.log('Redis ready'));

client.on('error', (err) => {
  console.error('Redis error:', err.message);
});

async function connectRedis() {
  if (!client.isOpen) {
    await client.connect();
    console.log('Connected to Redis');
  }
}

module.exports = { client, connectRedis };