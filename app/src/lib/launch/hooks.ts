'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createMerchantOperatorSession,
  destroyMerchantOperatorSession,
  fetchConsumerSummary,
  fetchMerchantOperatorSession,
  fetchMerchantSummary,
} from '@/lib/launch/client';
import type { ConsumerSummary, MerchantOperatorSession, MerchantSummary } from '@/lib/launch/types';

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

  const login = useCallback(async (payload: { operatorLabel: string; accessCode: string }) => {
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
