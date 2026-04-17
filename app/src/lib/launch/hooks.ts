'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createMerchantOperatorSession,
  destroyMerchantOperatorSession,
  fetchConsumerSummary,
  fetchMerchantAccessOptions,
  fetchMerchantOperatorSession,
  fetchMerchantSummary,
} from '@/lib/launch/client';
import type { ConsumerSummary, MerchantAccessOption, MerchantOperatorSession, MerchantSummary } from '@/lib/launch/types';

const CONSUMER_SUMMARY_CACHE_PREFIX = 'vs-launch-consumer-summary:';
const MERCHANT_SUMMARY_CACHE_KEY = 'vs-launch-merchant-summary';
const MERCHANT_ACCESS_OPTIONS_KEY = 'vs-launch-merchant-access-options';

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function readCachedQuery<T>(key: string): T | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeCachedQuery<T>(key: string, value: T) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Best-effort cache only.
  }
}

export function useConsumerSummary(sessionId: string | null): QueryState<ConsumerSummary> {
  const cacheKey = sessionId ? `${CONSUMER_SUMMARY_CACHE_PREFIX}${sessionId}` : null;
  const [data, setData] = useState<ConsumerSummary | null>(() => (cacheKey ? readCachedQuery<ConsumerSummary>(cacheKey) : null));
  const [loading, setLoading] = useState<boolean>(Boolean(sessionId) && !data);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cacheKey) {
      return;
    }

    const cached = readCachedQuery<ConsumerSummary>(cacheKey);
    if (cached) {
      setData(cached);
      setLoading(false);
    }
  }, [cacheKey]);

  const refresh = useCallback(async () => {
    if (!sessionId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const next = await fetchConsumerSummary();
      setData(next);
      setError(null);
      if (cacheKey) {
        writeCachedQuery(cacheKey, next);
      }
    } catch (caught) {
      const cached = cacheKey ? readCachedQuery<ConsumerSummary>(cacheKey) : null;
      if (cached) {
        setData(cached);
        setError('Showing cached passbook data while the network is unavailable.');
      } else {
        setError(caught instanceof Error ? caught.message : 'Failed to load consumer summary.');
      }
    } finally {
      setLoading(false);
    }
  }, [cacheKey, sessionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useMerchantSummary(): QueryState<MerchantSummary> {
  const [data, setData] = useState<MerchantSummary | null>(() => readCachedQuery<MerchantSummary>(MERCHANT_SUMMARY_CACHE_KEY));
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cached = readCachedQuery<MerchantSummary>(MERCHANT_SUMMARY_CACHE_KEY);
    if (cached) {
      setData(cached);
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchMerchantSummary();
      setData(next);
      setError(null);
      writeCachedQuery(MERCHANT_SUMMARY_CACHE_KEY, next);
    } catch (caught) {
      const cached = readCachedQuery<MerchantSummary>(MERCHANT_SUMMARY_CACHE_KEY);
      if (cached) {
        setData(cached);
        setError('Showing cached merchant data while the network is unavailable.');
      } else {
        setError(caught instanceof Error ? caught.message : 'Failed to load merchant summary.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useMerchantOperatorSession() {
  const [session, setSession] = useState<MerchantOperatorSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchMerchantOperatorSession();
      setSession(next);
      setError(next.authenticated ? null : next.reason ?? null);
    } catch (caught) {
      setSession({ authenticated: false });
      setError(caught instanceof Error ? caught.message : 'Failed to load merchant session.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (payload: { merchantSlug: string; operatorLabel: string; accessCode: string }) => {
    setLoading(true);
    try {
      const next = await createMerchantOperatorSession(payload);
      setSession(next);
      setError(null);
      return next;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await destroyMerchantOperatorSession();
      setSession({ authenticated: false });
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    session,
    loading,
    error,
    refresh,
    login,
    logout,
  };
}

export function useMerchantAccessOptions(): QueryState<MerchantAccessOption[]> {
  const [data, setData] = useState<MerchantAccessOption[] | null>(() => readCachedQuery<MerchantAccessOption[]>(MERCHANT_ACCESS_OPTIONS_KEY));
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cached = readCachedQuery<MerchantAccessOption[]>(MERCHANT_ACCESS_OPTIONS_KEY);
    if (cached) {
      setData(cached);
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchMerchantAccessOptions();
      setData(next);
      setError(null);
      writeCachedQuery(MERCHANT_ACCESS_OPTIONS_KEY, next);
    } catch (caught) {
      const cached = readCachedQuery<MerchantAccessOption[]>(MERCHANT_ACCESS_OPTIONS_KEY);
      if (cached) {
        setData(cached);
        setError('Showing cached merchant access options while the network is unavailable.');
      } else {
        setError(caught instanceof Error ? caught.message : 'Failed to load merchant access options.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
