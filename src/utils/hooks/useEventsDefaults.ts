import { useCallback, useEffect, useState } from 'react';
import useLocalStorage from './useLocalStorage';
import { WebEventsData } from '@/lib/prtsWiki/types';
import { EventsData, TrackerDefaults } from '@/lib/events/types';

export function useEventsDefaults() {
  const [dataDefaults, setDataDefaults] = useState<TrackerDefaults>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [trackerDefaults, setDefaults] = useLocalStorage<TrackerDefaults>("trackerDefaults", {});

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
      putDefaults(eventsUpdated, webEventsData, eventsData);
      setDataDefaults({ lastUpdated: eventsUpdated, webEventsData, eventsData });
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
        if (trackerDefaults.lastUpdated && new Date(trackerDefaults.lastUpdated) > dayAgo) {
          setDataDefaults(trackerDefaults)
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

  return { trackerDefaults: dataDefaults, loading, error, fetchDefaults: fetchEventsFromStorage, };
}