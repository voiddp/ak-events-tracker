import { useCallback, useEffect, useState } from 'react';
import useLocalStorage from './useLocalStorage';
import { WebEventsData } from '@/lib/prtsWiki/types';
import { EventsData } from '@/lib/events/types';

interface DefaultEvents {
  lastUpdated?: string;
  webEventsData?: WebEventsData;
  eventsData?: EventsData;
}

export function useEventsWebStorage() {
  const [dataDefaults, setDataDefaults] = useState<DefaultEvents>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [_dataDefaults, setDefaults] = useLocalStorage<DefaultEvents>("defaultEvents", {});

  const putDefaults = (updateTime: any, webEventsData: any, eventsData: any,) => {

    setDefaults({
      lastUpdated: updateTime,
      webEventsData: webEventsData,
      eventsData: eventsData
    });
  };

  const fetchEventsFromStorage = async (returnData: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/events');
      if (!response.ok) throw new Error('Failed to fetch data');
      const {
        webEventsData,
        eventsData,
        eventsUpdated
      } = await response.json();
      /* setDataDefaults({ webEventsData, eventsData });
      setLastUpdated(eventsUpdated); */
      putDefaults(eventsUpdated, webEventsData, eventsData);
      if (returnData) return { data: { webEventsData, eventsData } }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        //only pull defaults if no-data or data is one+ day old
        const dayAgo = new Date();
        dayAgo.setDate(dayAgo.getDate() - 1);
        if (_dataDefaults.lastUpdated && new Date(_dataDefaults.lastUpdated) > dayAgo) {
          setDataDefaults(_dataDefaults)
          return;
        }

        console.log("Fetching defaults from storage");
        await fetchEventsFromStorage();


      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []
  );

  return { dataDefaults, loading, error, fetchEventsFromStorage };
}