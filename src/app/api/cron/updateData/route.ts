import { NextResponse } from 'next/server';
import { getEverythingAtOnce } from '@/lib/prtsWiki/api';
import { createDefaultEventsData } from '@/lib/events/utils';
import { putEventsInStorage } from '@/lib/redisUtils';
import { nanoid } from 'nanoid';

export async function GET() {
  try {
    const session = { 
      sessionId: 'server-job-'+ nanoid(6),
      rateLimit_s: 3,
      isServerJob: true, 
    };
    const webEventsData = await getEverythingAtOnce(session);
    if (!webEventsData) {
      return NextResponse.json({
        success: false,
        error: "No data recieved from the API",
      }, { status: 500 });
    };
    const eventsData = createDefaultEventsData(webEventsData);
    if (eventsData) {
      const timestamp = await putEventsInStorage(webEventsData, eventsData);

      return NextResponse.json({
        success: true,
        eventsUpdated: timestamp
      });
    }
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';