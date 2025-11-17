import { NextResponse } from 'next/server';
import { fetchLastISEvents, fetchLastRAEvents } from '@/lib/prtsWiki/api';
import { putToStorage } from '@/lib/redis/utils';
import { nanoid } from 'nanoid';
import { ApiContext, WebEventsData } from '@/lib/prtsWiki/types';

export const maxDuration = 60;

export async function GET() {
  try {
    const session = {
      sessionId: 'server-job-' + nanoid(6),
      rateLimit_s: 1,
      isServerJob: true,
    };

    const context: ApiContext = { session };
    const startOfAk = new Date(2019, 0, 16);
    //const ISLibrary = await fetchLastISEvents(startOfAk, context, undefined, true);
    const RALibrary = await fetchLastRAEvents(startOfAk, context, undefined, true);
    /* if (!RALibrary || Object.keys(RALibrary ?? {}).length <= 2) {
      return NextResponse.json({
        success: false,
        error: "No data recieved from the API",
      }, { status: 500 });
    } else { */
      return NextResponse.json({
        success: true,
        //ISLibrary,
        RALibrary,
      });
   /*  }; */
  /*   const eventsData = createDefaultEventsData(webEventsData);
    if (eventsData) {
      const eventsUpdated = new Date().toISOString();
      await putToStorage({
        webEventsData,
        eventsData,
        eventsUpdated,
      });
    } */
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
