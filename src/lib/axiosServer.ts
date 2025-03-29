'use server'
import axios, { AxiosResponse } from 'axios';
import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL,
  socket: { reconnectStrategy: (retries) => Math.min(retries * 100, 5000) }
});
await redis.connect();

const RATE_LIMIT_MS = 2000;
const QUEUE_KEY = 'request_queue';
const LOCK_TIMEOUT = 5000; // 3 second lock timeout

class AxiosServer {
  private constructor() { }

  public static createInstance(): AxiosServer {
    return new AxiosServer();
  }

  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    try {
      const lockAcquired = await redis.set('global:lock', '1', {
        NX: true,
        EX: LOCK_TIMEOUT / 1000
      });
      if (!lockAcquired) throw new Error('Could not acquire lock');
      return await fn();
    } finally {
      await redis.del('global:lock');
    }
  }

  public async fetchData<T>(url: string, sessionId: string): Promise<T> {
    const userAgent = {
      headers: { 'User-Agent': `AKEventsTracker (in-built ${RATE_LIMIT_MS / 1000}s delay, voiddp@gmail.com)` }
    };

    try {
      // 1. Add to queue and wait for turn
      console.log(`[${new Date().toISOString()}] [${sessionId}] Adding to queue...`);
      await redis.rPush(QUEUE_KEY, sessionId);

      while (true) {
        const [firstInQueue, queueLength] = await redis.multi()
          .lIndex(QUEUE_KEY, 0)
          .lLen(QUEUE_KEY)
          .exec();
        console.log(`[${new Date().toISOString()}] [${sessionId}] First in query? ${firstInQueue === sessionId}`);
        if (firstInQueue === sessionId) {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 2. Process with rate limiting
      return await this.withLock(async () => {
        const lastRequestTime = await redis.get('global:last_request');
        const delay = Math.max(0, RATE_LIMIT_MS - (Date.now() - parseInt(lastRequestTime || '0')));

        if (delay > 0) {
          console.log(`[${new Date().toISOString()}] [${sessionId}] Delaying by ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        console.log(`[${new Date().toISOString()}] [${sessionId}] Fetching: <<<<<<<<<<<<`);
        const response: AxiosResponse<T> = await axios.get(url, userAgent);

        // Update last request time
        await redis.set('global:last_request', Date.now().toString(), { EX: 60 });
        if (response.status >= 200 && response.status < 300) {
          return response.data;
        } throw new Error(`Request failed with status ${response.status}`);
      });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [${sessionId}] Error:`, error);
      throw error;
    } finally {
      // Cleanup queue
      console.log(`[${new Date().toISOString()}] [${sessionId}] remove from query...`);
      await redis.lRem(QUEUE_KEY, 0, sessionId);
    }
  }
}

const axiosServer = AxiosServer.createInstance();

export async function fetchHtml(url: string, sessionId: string = 'anonymous'): Promise<string> {
  if (!url) throw new Error('No page link provided');
  return await axiosServer.fetchData(url, sessionId);
}

export async function fetchJson<T = any>(url: string, sessionId: string = 'anonymous'): Promise<T> {
  if (!url) throw new Error('No page link provided');
  return await axiosServer.fetchData<T>(url, sessionId);
}