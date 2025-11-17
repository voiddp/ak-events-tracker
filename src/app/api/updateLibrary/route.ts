import { NextRequest, NextResponse } from 'next/server';
import { fetchLastISEvents, fetchLastRAEvents } from '@/lib/prtsWiki/api';
import { putToStorage } from '@/lib/redis/utils';
import { nanoid } from 'nanoid';
import { ApiContext } from '@/lib/prtsWiki/types';

//just local repo api to parse and store library for now manually 
const allowedOrigins = [
  'http://localhost:3000',
];

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  if (origin !== '')
    console.log(origin);

  let responseData: any;
  let status = 200;

  try {
    const session = {
      sessionId: 'server-job-' + nanoid(6),
      rateLimit_s: 1,
      isServerJob: true,
    };

    const context: ApiContext = { session };
    const startOfAk = new Date(2019, 0, 16);

    const ISArchive = await fetchLastISEvents(startOfAk, context, undefined, true);
    const RAArchive = await fetchLastRAEvents(startOfAk, context, undefined, true);

    if (!RAArchive || Object.keys(RAArchive).length <= 2
      || !ISArchive || Object.keys(ISArchive).length <= 2) {
      responseData = { error: "No data recieved from the API" };
      status = 404;
    } else {
      const archive = {
        integratedStrategies: ISArchive,
        reclamationAlgorithm: RAArchive,
      }
      await putToStorage({
        archive
      });
      responseData = { archive };
    }
  }
  catch (error) {
    console.error('Failed to fetch web events:', error);
    responseData = { error: 'Failed to fetch data' };
    status = 500;
  }
  const response = NextResponse.json(responseData, { status });

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

export const dynamic = 'force-dynamic';
