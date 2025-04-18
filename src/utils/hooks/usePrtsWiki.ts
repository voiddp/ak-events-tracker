'use client'
import { useCallback, useState } from 'react';
import { randomBytes } from 'crypto';
import useLocalStorage from '@/utils/hooks/useLocalStorage';
import { 
  getEverythingAtOnce,
  getEventList,
  getDataFromPage
} from '@/lib/prtsWiki/api';
import { Session } from '@/lib/axios/types';
import { WebEventsData } from '@/lib/prtsWiki/types';
import ProgressBar from "@/components/webEvents/ProgressBar"

export const usePrtsWiki = () => {
  const [webEvents, setWebEvents] = useLocalStorage<WebEventsData>("prtsWikiData", {});
  const sessionId = randomBytes(8).toString('hex');
  
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [rateLimit, setRateLimit] = useState<number>(0);
  const [turnback, setTurnback] = useState(true);

  const handleProgress = useCallback((key: string, value: number) => {
    setProgress(prev => ({ ...prev ?? {}, [key]: value }));
  }, []);

  const handleError = useCallback((err: unknown) => {
    const error = err instanceof Error ? err : new Error('Unknown error');
    setError(error);
    throw error;
  }, []);

  const clientGetEverythingAtOnce = useCallback(async (rate_limit_s: number) => {
    setRateLimit(rate_limit_s);
    try {
      const session: Session = { sessionId, rateLimit_s: rate_limit_s };
      return await getEverythingAtOnce(session, handleProgress);
    } catch (err) {
      return handleError(err);
    }
  }, [sessionId, handleProgress, handleError]);

  const clientGetEventList = useCallback(async (monthsAgo: number) => {

    if (turnback) {
      setError(new Error('"Preloaded 6m data probably wont change. To reload anyway, press again" '));
      setTurnback(false);
      return;
    } else {
      setError(null);
    }

    setLoading(prev => ({ ...prev, LIST: true }));
    try {
      const session: Session = { sessionId, rateLimit_s: rateLimit };
      return await getEventList(monthsAgo, { 
        session, 
        setProgress: handleProgress 
      });
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(prev => ({ ...prev, LIST: false }));
      setProgress(prev => ({ ...prev, LIST: 100 }));
    }
  }, [turnback, sessionId, rateLimit, handleProgress, handleError]);

  const clientGetDataFromPage = useCallback(async (pageName: string, page_link: string) => {
    setError(null);
    setLoading(prev => ({ ...prev, [pageName]: true }));
    try {
      const session: Session = { sessionId, rateLimit_s: rateLimit };
      return await getDataFromPage(pageName, page_link, { 
        session, 
        setProgress: handleProgress 
      });
    } catch (err) {
      return handleError(err);
    } finally {
      setLoading(prev => ({ ...prev, [pageName]: false }));
    }
  }, [sessionId, rateLimit, handleProgress, handleError]);

  const createProgressElement = (pageName: string) => {
    return ProgressBar(pageName, progress);
  }

  return {
    webEvents,
    setWebEvents,
    getEventList: clientGetEventList,
    getDataFromPage: clientGetDataFromPage,
    getEverythingAtOnce: clientGetEverythingAtOnce,
    error,
    loading,
    ProgressElement : createProgressElement,
  };
};