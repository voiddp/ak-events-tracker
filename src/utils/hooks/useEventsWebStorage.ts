import { useState } from 'react';

export function useEventsWebStorage() {
  const [data, setData] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEventsFromStorage = async () => {
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
      setData({webEventsData, eventsData});
      setLastUpdated(eventsUpdated);
      return {data: {webEventsData, eventsData}, lastUpdated: eventsUpdated}
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return { data, lastUpdated, loading, error, fetchEventsFromStorage };
}