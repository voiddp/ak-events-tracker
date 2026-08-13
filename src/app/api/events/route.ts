import { NextRequest, NextResponse } from 'next/server';
import { getFromStorage } from '@/lib/redis/utils';

const allowedOrigins = [
  'https://krooster.com',
  'https://www.krooster.com',
];
const CACHE_TTL = 86400;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  const isAllowed = allowedOrigins.includes(origin);

  const createResponse = (body: any, status: number = 200, headers: Record<string, string> = {}) => {
    const res = NextResponse.json(body, { status, headers });
    if (isAllowed) {
      res.headers.set('Access-Control-Allow-Origin', origin);
    }
    res.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    //to make cache global.
    res.headers.delete('Vary');
    res.headers.set('Vary', 'Accept-Encoding');
    return res;
  };
  
  if (origin && !isAllowed) {
    console.log('Blocked request from origin:', origin);
    return new NextResponse('Forbidden', { status: 403 });
  } else if (!origin) {
    console.log('no origin header');
  } else {
    console.log(origin, "- is allowed");
  }
  
  const now = Date.now();
  let responseData: any;
  let status = 200;
  let _eventsUpdated;

  try {
    const { webEventsData, eventsData, eventsUpdated, archive } = await getFromStorage([
      'webEventsData',
      'eventsData',
      'eventsUpdated',
      'archive',
    ]);

    if (!webEventsData || !eventsData) {
      responseData = { error: 'No data available' };
      status = 404;
    } else {
      _eventsUpdated = eventsUpdated;
      const eventsUpdatedTime = new Date(eventsUpdated).getTime();
      const elapsedMs = now - eventsUpdatedTime;

      // If data is older than 24h, advance eventsUpdated by 24h * amount of elapsed days
      if (elapsedMs > DAY_IN_MS) {
        const daysPassed = Math.floor(elapsedMs / DAY_IN_MS);
        
        console.warn(
          `Data is older than 24 hours (${daysPassed} days stale), faking eventsUpdated +${daysPassed * 24}h to prevent client edge requests.`
        );

        _eventsUpdated = new Date(eventsUpdatedTime + (daysPassed * DAY_IN_MS)).toISOString();
      }
      responseData = {
        webEventsData,
        eventsData,
        eventsUpdated: _eventsUpdated,
        archive
      };
    }
  } catch (error) {
    console.error('Failed to fetch web events:', error);
    return createResponse({ error: 'Failed to fetch data' }, 500);
  }
  
  // Calculate cache expiration
  const baseDate = _eventsUpdated ? new Date(_eventsUpdated).getTime() : now;
  const nextRefreshDate = baseDate + (24 * 60 * 60 * 1000);
  const raw_age = Math.floor((nextRefreshDate - now) / 1000);
  
  let age_s: number;
  if (raw_age > CACHE_TTL / 2) {
    age_s = Math.floor(CACHE_TTL / 2); // 12h
  } else if (raw_age > CACHE_TTL / 4) {
    age_s = Math.floor(CACHE_TTL / 4); // 6h
  } else {
    age_s = 3600; // 1h
  }
  const response = createResponse(responseData, status);
  // Set CDN Cache headers
  response.headers.set(
    'Cache-Control',
    `public, s-maxage=${age_s}, stale-while-revalidate=${age_s * 2}, max-age=0`
  );
  
  return response;
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || '';

  const response = new NextResponse(null, { status: 204 });

  if (allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  //response.headers.set('Vary', 'Origin');

  return response;
}

/* export const dynamic = 'force-dynamic'; */
