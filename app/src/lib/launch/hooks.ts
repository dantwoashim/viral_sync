'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchConsumerSummary, fetchMerchantSummary } from '@/lib/launch/client';
import type { ConsumerSummary, MerchantSummary } from '@/lib/launch/types';

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useConsumerSummary(sessionId: string | null): QueryState<ConsumerSummary> {
  const [data, setData] = useState<ConsumerSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(sessionId));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!sessionId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const next = await fetchConsumerSummary(sessionId);
      setData(next);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to load consumer summary.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useMerchantSummary(): QueryState<MerchantSummary> {
  const [data, setData] = useState<MerchantSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchMerchantSummary();
      setData(next);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to load merchant summary.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
