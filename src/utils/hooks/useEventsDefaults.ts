import { useCallback, useEffect, useState } from 'react';
import useLocalStorage from './useLocalStorage';
import { WebEventsData } from '@/lib/prtsWiki/types';
import { EventsData, TrackerDefaults } from '@/lib/events/types';

export interface EventsDefaultsHook {
  readonly trackerDefaults: TrackerDefaults;
  readonly loading: boolean;
  readonly error: string | null;
  readonly fetchDefaults: (returnData?: boolean) => Promise<{ data: { webEventsData: any; eventsData: any; }; } | undefined>;
  readonly toggleDefaultsEvent: (name: string) => void;
}

export default function useEventsDefaults(): EventsDefaultsHook {
  const [dataDefaults, setDataDefaults] = useState<TrackerDefaults>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [trackerDefaults, setDefaults] = useLocalStorage<TrackerDefaults>("trackerDefaults", {});

  const putDefaults = (updateTime: any, webEventsData: any, eventsData: any, archive: any) => {

    //merge with existing "disabled" props
    const mergedEventsData: EventsData = Object.fromEntries(
      Object.entries(eventsData as EventsData).map(([name, event]) => {
        return [
          name,
          {
            ...event,
            disabled: trackerDefaults.eventsData?.[name]?.disabled ?? false,
          },
        ];
      })
    );

    setDefaults({
      lastUpdated: updateTime,
      webEventsData,
      eventsData: mergedEventsData,
      archive
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
        eventsUpdated,
        archive
      } = await response.json();
      putDefaults(eventsUpdated, webEventsData, eventsData, archive);
      setDataDefaults({ lastUpdated: eventsUpdated, webEventsData, eventsData, archive }); //remove for krooster
      if (returnData) return { data: { webEventsData, eventsData } }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };
  //lazy fetching by fetchDefaults() call from hook.
  //uncomment useEffect to fetch on page load.
  useEffect(() => {
  const fetchData = async () => {
    try {
      //only pull defaults if no-data or data is one+ day old
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);
      if (trackerDefaults.lastUpdated && new Date(trackerDefaults.lastUpdated) > dayAgo) {
        setDataDefaults(trackerDefaults); //remove for krooster
        return;
      }

      /* console.log("Fetching defaults from storage"); */
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

  const toggleDefaultsEvent = (name: string) => {
    setDefaults((prev) => {
      const event = prev.eventsData?.[name];
      if (!event) return prev;

      return {
        ...prev,
        eventsData: {
          ...prev.eventsData,
          [name]: {
            ...event,
            disabled: !event.disabled,
          },
        },
      };
    });
  };

  return { trackerDefaults: dataDefaults, loading, error, fetchDefaults: fetchEventsFromStorage, toggleDefaultsEvent } as const;
}