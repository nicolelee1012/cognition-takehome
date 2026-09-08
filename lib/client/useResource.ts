"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Small shared data-loading hook every workflow page uses, so list/detail
 * screens get consistent loading, error and refresh behaviour.
 */
export function useResource<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedLoad = useCallback(load, deps);

  const refresh = useCallback(() => {
    setLoading(true);
    memoizedLoad()
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [memoizedLoad]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, setData, error, loading, refresh };
}
