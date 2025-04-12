'use server'
import { Session } from './types'
import axios, { AxiosResponse } from 'axios';
import { createClient } from 'redis'
import redisClient from '@/lib/redis/client';
import { isLockActive, setLock, removeLock, addToQueue, getQueueHead, removeFromQueue, getQueue, getKeyValue, setKeyValue } from '@/lib/redis/utils';

/* const redis = createClient({
  url: process.env.REDIS_URL,
  socket: { reconnectStrategy: (retries) => Math.min(retries * 100, 5000) }
});
await redis.connect(); */


const RATE_LIMIT_MS = 2000;
const QUEUE_KEY = 'request_queue';
const SERVER_JOB_LOCK_KEY = 'server-job:active';
const LOCK_TIMEOUT = 5000;

class AxiosServer {
  private constructor() { }

  public static createInstance(): AxiosServer {
    return new AxiosServer();
  }

  private async checkServerJobActive(): Promise<boolean> {
    return await isLockActive(SERVER_JOB_LOCK_KEY);
  }

  private async withLock<T>(fn: () => Promise<T>, session: Session): Promise<T> {
    const isServerJob = (session as any).isServerJob;
    const lockKey = isServerJob ? 'server-job:lock' : 'global:lock';
    const lockTimeout = isServerJob ? 60000 : LOCK_TIMEOUT;

    try {
      const lockAcquired = await setLock(lockKey, lockTimeout);
      if (!lockAcquired) throw new Error('Could not acquire lock');
      return await fn();
    } finally {
      await removeLock(lockKey);
    }
  }

  public async fetchData<T>(url: string, session: Session): Promise<T> {
    const sessionId = session.sessionId ? session.sessionId : 'anonymous';
    const isServerJob = (session as any).isServerJob;

    // Block non-server jobs if server job is active
    if (!isServerJob && await this.checkServerJobActive()) {
      throw new Error('Server update job in progress. Please try again in few minutes.');
    }

    const rate_limit_s = session.rateLimit_s;
    const _rateLimit_MS = rate_limit_s && (rate_limit_s * 1000 > RATE_LIMIT_MS || isServerJob)
      ? rate_limit_s * 1000
      : RATE_LIMIT_MS;

    const userAgent = {
      headers: {
        'User-Agent': `AKEventsTracker (${isServerJob ? 'cron' : 'user'})`,
        'X-EventTracker-Info': JSON.stringify({
          source: 'ak-event-tracker.vercel.app',
          rate_limit: _rateLimit_MS,
          update_type: isServerJob ? 'scheduled /24h' : 'interactive',
        })
      }
    };
    const maxWaitTime = isServerJob ? 60_000 : 10_000;
    let fullQueue: string[] = [];
    try {
      // 1. Add to queue and wait for turn
      //timing in logs [${new Date().toISOString()}]
      console.log(`rate_limit: ${_rateLimit_MS}`);
      console.log(url);
      // Set server job active flag if this is a server job
      if (isServerJob) {
        await setLock(SERVER_JOB_LOCK_KEY, 60_000); // 1mins lock
      }

      const numInQuery = await addToQueue(QUEUE_KEY, sessionId);
      console.log(`[${sessionId}] added to queue: #${numInQuery}`);


      const startTime = Date.now();
      let isMyTurn = false;

      while (Date.now() - startTime < maxWaitTime) {
        const { firstItem } = await getQueueHead(QUEUE_KEY)

        /* console.log(`Queue state - First: ${firstInQueue}, Length: ${queueLength}`); */
        if (firstItem === sessionId) {
          isMyTurn = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (!isMyTurn) {
        const numRemoved = await removeFromQueue(QUEUE_KEY, sessionId);
        console.warn(`[${sessionId}] x${numRemoved}. Timed out from queue ${maxWaitTime / 1000}s, removed`);
        throw new Error(`Queue timeout (${maxWaitTime / 1000}s)`);
      }

      // 2. Process with rate limiting
      return await this.withLock(async () => {
        const lastRequestTime = await getKeyValue('global:last_request');
        const delay = Math.max(0, _rateLimit_MS - (Date.now() - parseInt(lastRequestTime || '0')));

        if (delay > 0) {
          console.log(`[${sessionId}] Delaying by ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        console.log(`[${sessionId}] Fetching: <<<<<<<<<<<<`);
        const response: AxiosResponse<T> = await axios.get(url, userAgent);
        // Update last request time
        await setKeyValue('global:last_request', Date.now().toString(), 60_000);

        if (response.status >= 200 && response.status < 300) {
          return response.data;
        } throw new Error(`Request failed with status ${response.status}`);
      }, session);
    } catch (error) {
      fullQueue = await getQueue(QUEUE_KEY);
      console.error(`[${sessionId}] Error:`, error);
      throw error;
    } finally {
      const numRemoved = await removeFromQueue(QUEUE_KEY, sessionId);
      console.log(`[${sessionId}] x${numRemoved} removed from query: ${fullQueue}`);
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