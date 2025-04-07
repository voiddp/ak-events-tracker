'use server'
import { Session } from  './types'
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

  private async withLock<T>(fn: () => Promise<T>, session: Session): Promise<T> {
    const isServerJob = (session as any).isServerJob;
    const lockKey = isServerJob ? 'server-job:lock' : 'global:lock';
    const lockTimeout = isServerJob ? 30000 : LOCK_TIMEOUT; // 30s for server jobs
    
    try {
      const lockAcquired = await redis.set(lockKey, '1', {
        NX: true,
        EX: LOCK_TIMEOUT / 1000
      });
      if (!lockAcquired) throw new Error('Could not acquire lock');
      return await fn();
    } finally {
      await redis.del(lockKey);
    }
  }

  public async fetchData<T>(url: string, session: Session): Promise<T> {
    const sessionId = session.sessionId ? session.sessionId : 'anonymous';
    const rate_limit_s = session.rateLimit_s;
    const _rateLimit_MS = (rate_limit_s && rate_limit_s * 1000 > RATE_LIMIT_MS) ? rate_limit_s * 1000 : RATE_LIMIT_MS;

    const userAgent = {
      headers: { 'User-Agent': `AKEventsTracker (in-built min ${RATE_LIMIT_MS / 1000}s delay)` }
    };
    
    //fetch for session can be slowed down further, but not faster then RATE_LIMIT_MS
    const maxWaitTime = 10_000;
    const startTime = Date.now();

    try {
      // 1. Add to queue and wait for turn
      //timing in logs [${new Date().toISOString()}]
      console.log(`rate_limit: ${_rateLimit_MS}`);
      console.log(url);
      console.log(`[${sessionId}] Adding to queue...`);
      await redis.rPush(QUEUE_KEY, sessionId);

      const fullQueue = await redis.lRange(QUEUE_KEY, 0, -1);
      console.log(`Full queue contents:`, fullQueue);

      const startTime = Date.now();
      let isMyTurn = false;

      while (Date.now() - startTime < maxWaitTime) {
        const [firstInQueue, queueLength] = await redis.multi()
          .lIndex(QUEUE_KEY, 0)
          .lLen(QUEUE_KEY)
          .exec();

        /* console.log(`Queue state - First: ${firstInQueue}, Length: ${queueLength}`); */
        if (firstInQueue === sessionId) {
          isMyTurn = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (!isMyTurn) {
        console.warn(`[${sessionId}] Timed out waiting in queue after ${maxWaitTime / 1000}s`);
        await redis.lRem(QUEUE_KEY, 0, sessionId);
        throw new Error(`Queue timeout (${maxWaitTime / 1000}s)`);
      }

      // 2. Process with rate limiting
      return await this.withLock(async () => {
        const lastRequestTime = await redis.get('global:last_request');
        const delay = Math.max(0, _rateLimit_MS - (Date.now() - parseInt(lastRequestTime || '0')));

        if (delay > 0) {
          console.log(`[${sessionId}] Delaying by ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        console.log(`[${sessionId}] Fetching: <<<<<<<<<<<<`);
        const response: AxiosResponse<T> = await axios.get(url, userAgent);

        // Update last request time
        await redis.set('global:last_request', Date.now().toString(), { EX: 60 });
        if (response.status >= 200 && response.status < 300) {
          return response.data;
        } throw new Error(`Request failed with status ${response.status}`);
      }, session);
    } catch (error) {
      console.error(`[${sessionId}] Error:`, error);
      throw error;
    } finally {
      // Cleanup queue
      console.log(`[${sessionId}] remove from query...`);
      await redis.lRem(QUEUE_KEY, 0, sessionId);
    }
  }
}

const axiosServer = AxiosServer.createInstance();

export async function fetchHtml(url: string, session: Session): Promise<string> {
  if (!url) throw new Error('No page link provided');
  return await axiosServer.fetchData(url, session);
}

export async function fetchJson<T = any>(url: string, session: Session): Promise<T> {
  if (!url) throw new Error('No page link provided');
  return await axiosServer.fetchData<T>(url, session);
}