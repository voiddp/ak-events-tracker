import { NextResponse } from 'next/server';
import { getFromStorage } from '@/lib/redis/utils';

const allowedOrigins = [
  'https://www.krooster.com',
  'http://localhost:3000',
];

export async function GET(request: Request) {
  try {
    // Check the request origin
    const origin = request.headers.get('origin');

    // Set CORS headers if the origin is allowed
    const headers = new Headers();
    if (origin && allowedOrigins.includes(origin)) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type');
    };

    const { webEventsData, eventsData, eventsUpdated } = await getFromStorage([
      'webEventsData',
      'eventsData',
      'eventsUpdated',
    ]);

    if (!webEventsData || !eventsData) {
      return NextResponse.json(
        { error: 'No data available' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      webEventsData,
      eventsData,
      eventsUpdated
    });
  } catch (error) {
    console.error('Failed to fetch web events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*'); // Allow preflight from any origin
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return new NextResponse(null, { status: 204, headers });
}

export const dynamic = 'force-dynamic';