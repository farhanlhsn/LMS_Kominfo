"use client";

import { useCallback, useState } from "react";

export interface UseApiMutationResult<TArgs extends unknown[]> {
  loading: boolean;
  error: Error | null;
  mutate: (...args: TArgs) => Promise<void>;
}

export function useApiMutation<TArgs extends unknown[]>(
  callback: (...args: TArgs) => Promise<unknown>,
): UseApiMutationResult<TArgs> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (...args: TArgs) => {
      setLoading(true);
      setError(null);
      try {
        await callback(...args);
      } catch (caught) {
        setError(caught instanceof Error ? caught : new Error(String(caught)));
      } finally {
        setLoading(false);
      }
    },
    [callback],
  );

  return { loading, error, mutate };
}
