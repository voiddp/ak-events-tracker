import { NextResponse } from 'next/server';
import { getEverythingAtOnce } from '@/lib/prtsWiki/api';
import { createDefaultEventsData } from '@/lib/events/utils';
import { putToStorage } from '@/lib/redis/utils';
import { nanoid } from 'nanoid';

export const maxDuration = 60;

export async function GET() {
  try {
    const session = { 
      sessionId: 'server-job-'+ nanoid(6),
      rateLimit_s: 0.2,
      isServerJob: true, 
    };
    const webEventsData = await getEverythingAtOnce(session);
    if (!webEventsData || Object.keys(webEventsData ?? {}).length <= 2) {
      return NextResponse.json({
        success: false,
        error: "No data recieved from the API",
      }, { status: 500 });
    };
    const eventsData = createDefaultEventsData(webEventsData);
    if (eventsData) {
      const eventsUpdated = new Date().toISOString();
      await putToStorage({
        webEventsData,
        eventsData,
        eventsUpdated,
      });
      /* const timestamp = await putEventsInStorage(webEventsData, eventsData); */

      return NextResponse.json({
        success: true,
        eventsUpdated
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