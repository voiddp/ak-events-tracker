'use client'
import { useCallback, useState } from 'react';
import { randomBytes } from 'crypto';
import useLocalStorage from '@/utils/hooks/useLocalStorage';
import { 
  getEverythingAtOnce,
  getEventList,
  getDataFromPage
} from './api';
import { Session } from '@/lib/axios/types';
import { WebEventsData } from './types';
import { LinearProgress } from '@mui/material';

export const usePrtsWiki = () => {
  const [webEvents, setWebEvents] = useLocalStorage<WebEventsData>("prtsWikiData", {});
  const sessionId = randomBytes(8).toString('hex');
  
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [rateLimit, setRateLimit] = useState<number>(0);

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
  }, [sessionId, rateLimit, handleProgress, handleError]);

  const clientGetDataFromPage = useCallback(async (pageName: string, page_link: string) => {
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

  const ProgressElement = (pageName: string) => (
    <div style={{ width: "100%" }}>
      <LinearProgress variant="determinate" value={progress[pageName] ?? 0} />
    </div>
  );

  return {
    webEvents,
    setWebEvents,
    getEventList: clientGetEventList,
    getDataFromPage: clientGetDataFromPage,
    getEverythingAtOnce: clientGetEverythingAtOnce,
    error,
    loading,
    ProgressElement,
  };
};