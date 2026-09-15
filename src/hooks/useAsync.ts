import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

export interface AsyncState<T> {
  data: T | undefined;
  error: Error | undefined;
  /** True during the first load (and after `reload`). */
  isLoading: boolean;
  /** True during pull-to-refresh. Existing data stays on screen. */
  isRefreshing: boolean;
  /** Re-run and show the full loading state, e.g. from an error "Try again" button. */
  reload: () => void;
  /** Re-run for pull-to-refresh. Sets `isRefreshing` while running. */
  refresh: () => void;
  /** Re-run with no spinners at all, e.g. when a tab regains focus. */
  revalidate: () => void;
}

/**
 * Runs an async function (usually an API call) and tracks loading, error and
 * refresh state. Re-runs whenever `deps` change.
 *
 *   const summary = useAsync(() => api.getDailySummary());
 *   const activity = useAsync(() => api.getActivityReport(range), [range]);
 *
 * If the app later outgrows this, TanStack Query is a drop-in upgrade with
 * the same shape (data / error / isLoading / refetch).
 */
export function useAsync<T>(fetcher: () => Promise<T>, deps: DependencyList = []): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Each run gets an id so a slow, outdated response never overwrites a newer one.
  const latestRequest = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async (mode: 'load' | 'refresh' | 'silent') => {
    const requestId = ++latestRequest.current;
    if (mode === 'load') setIsLoading(true);
    if (mode === 'refresh') setIsRefreshing(true);

    try {
      const result = await fetcherRef.current();
      if (requestId !== latestRequest.current) return;
      setData(result);
      setError(undefined);
    } catch (caught) {
      if (requestId !== latestRequest.current) return;
      setError(caught instanceof Error ? caught : new Error(String(caught)));
    } finally {
      if (requestId === latestRequest.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void run('load');
    return () => {
      // Invalidate in-flight requests on unmount or when deps change.
      latestRequest.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const reload = useCallback(() => void run('load'), [run]);
  const refresh = useCallback(() => void run('refresh'), [run]);
  const revalidate = useCallback(() => void run('silent'), [run]);

  return { data, error, isLoading, isRefreshing, reload, refresh, revalidate };
}
