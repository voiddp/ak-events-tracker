import { NextRequest, NextResponse } from 'next/server';
import { getFromStorage } from '@/lib/redis/utils';

const allowedOrigins = [
  'https://krooster.com',
  'https://www.krooster.com',
];
const CACHE_TTL = 86400;

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  if (origin && !allowedOrigins.includes(origin)) {
    console.log('Blocked request from origin:', origin);
    return new NextResponse('Forbidden', { status: 403 });
  } else if (!origin) {
    console.log('no origin header');
  } else {
    console.log(origin, "- is allowed");
  }

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
      //check if 24h old (/24h update failed), and fake eventsUpdated to +24h more to stop client from triggering update till next day cron.
      _eventsUpdated = eventsUpdated;
      const now = Date.now();
      const eventsUpdatedTime = new Date(eventsUpdated).getTime();
      if (now - eventsUpdatedTime > 24 * 60 * 60 * 1000) {
        console.warn('Data is older than 24 hours, faking eventsUpdated to prevent client edge requests.');
        _eventsUpdated = new Date(eventsUpdatedTime + 24 * 60 * 60 * 1000).toISOString(); //+24h
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
    responseData = { error: 'Failed to fetch data' };
    status = 500;

  }
  const response = NextResponse.json(responseData, { status });

  const baseDate = _eventsUpdated ? new Date(_eventsUpdated).getTime() : Date.now();
  const nextRefreshDate = baseDate + (24 * 60 * 60 * 1000);
  const now = Date.now();

  let raw_age = Math.floor((nextRefreshDate - now) / 1000);
  let age_s;
  if (raw_age > CACHE_TTL / 2) {
    age_s = Math.floor(CACHE_TTL / 2); // 12h
  } else if (raw_age > CACHE_TTL / 4) {
    age_s = Math.floor(CACHE_TTL / 4); // 6h
  } else {
    age_s = 3600; // 1h
  }
  //CDN cache 
  response.headers.set(
    'Cache-Control',
    `public, s-maxage=${age_s}, stale-while-revalidate=${age_s * 2}, max-age=0`
  );

  // Set CORS headers
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  //to make cache global.
  response.headers.delete('Vary');
  response.headers.set('Vary', 'Accept-Encoding');

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