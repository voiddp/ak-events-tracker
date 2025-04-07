import { useEffect, useState } from 'react';

export function useEventsWebStorage() {
  const [dataDefaults, setDataDefaults] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setDataDefaults({ webEventsData, eventsData });
      setLastUpdated(eventsUpdated);
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

  return { dataDefaults, lastUpdated, loading, error, fetchEventsFromStorage };
}