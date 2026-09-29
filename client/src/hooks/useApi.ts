import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/api/client';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Minimal data-fetching hook. Gives every page consistent loading /
 * error / empty handling without pulling in a data-fetching library.
 */
export function useApi<T>(fetcher: (signal: AbortSignal) => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<UseApiState<T>>({ data: null, loading: true, error: null });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async (silent = false) => {
    const controller = new AbortController();
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetcherRef.current(controller.signal);
      setState({ data, loading: false, error: null });
    } catch (err) {
      if (controller.signal.aborted) return;
      const message =
        err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
      setState((s) => ({ ...s, loading: false, error: message }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstRef = useRef(true);
  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, refetch: () => load(true) };
}
