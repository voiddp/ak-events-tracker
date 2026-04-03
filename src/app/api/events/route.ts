import { NextRequest, NextResponse } from 'next/server';
import { getFromStorage } from '@/lib/redis/utils';

const allowedOrigins = [
  'https://krooster.com',
  'https://www.krooster.com',
  'http://localhost:3000',
];
const CACHE_TTL = 86400;

export const revalidate = 86400;

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  if (origin !== '')
    console.log(origin);

  let responseData: any;
  let status = 200;

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
    } else
      responseData = {
        webEventsData,
        eventsData,
        eventsUpdated,
        archive
      };
  } catch (error) {
    console.error('Failed to fetch web events:', error);
    responseData = { error: 'Failed to fetch data' };
    status = 500;

  }
  const response = NextResponse.json(responseData, { status });

  // s-maxage=24h: Vercel Edge caches this for 24 hours.
  //invalidation happens via revalidatePath('/api/events') in the cron job after data update.
  // stale-while-revalidate: If the cache is old, serve it anyway while fetching fresh data in the background.
  response.headers.set(
    'Cache-Control',
    `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL}, max-age=0`
  );

  // Set CORS headers
  if (allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  response.headers.set('Vary', 'Origin');

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
  response.headers.set('Vary', 'Origin');

  return response;
}

/* export const dynamic = 'force-dynamic'; */