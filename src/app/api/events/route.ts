import { NextResponse } from 'next/server';
import { getFromStorage } from '@/lib/redis/utils';

export async function GET(request: Request) {
  try {
    const origin = request.headers.get('origin');
    console.log('/api/events request by :', origin);

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

export const dynamic = 'force-dynamic';