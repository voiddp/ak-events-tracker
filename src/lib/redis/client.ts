import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: { reconnectStrategy: (retries) => Math.min(retries * 100, 5000) }
});


if (!redisClient.isOpen) {
  redisClient.connect().catch(console.error);
}

export default redisClient;