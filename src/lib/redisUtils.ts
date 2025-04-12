/* import { createClient } from 'redis';

const redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: { reconnectStrategy: (retries) => Math.min(retries * 100, 5000) }
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

export async function connectRedis() {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
    return redisClient;
}

export async function putEventsInStorage(webEventsData: any, eventsData: any) {
    const client = await connectRedis();
    const timestamp = new Date().toISOString();
    await client.set('webEventsData', JSON.stringify(webEventsData));
    await client.set('eventsData', JSON.stringify(eventsData));
    await client.set('eventsUpdated', timestamp);
    return timestamp;
}

export async function getEventsFromStorage() {
    const client = await connectRedis();
    const [webEventsData, eventsData, timestamp] = await Promise.all([
        client.get('webEventsData'),
        client.get('eventsData'),
        client.get('eventsUpdated')
    ]);
    return {
        webEventsData: webEventsData ? JSON.parse(webEventsData) : null,
        eventsData: eventsData ? JSON.parse(eventsData) : null,
        eventsUpdated: timestamp
    };
} */