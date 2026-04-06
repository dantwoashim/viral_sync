'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import {
  fetchConsumerSession,
  rotateConsumerSession,
  updateConsumerSession,
} from '@/lib/launch/client';
import type { ConsumerLoginMethod } from '@/lib/launch/types';

export type UserRole = 'consumer' | 'merchant' | null;

export interface AuthState {
  loading: boolean;
  authenticated: boolean;
  walletAddress: PublicKey | null;
  displayName: string;
  deviceId: string;
  avatarUrl: string | null;
  loginMethod: ConsumerLoginMethod;
  role: UserRole;
  login: () => void;
  logout: () => void;
  setRole: (role: UserRole) => void;
  hasSessionKey: boolean;
  sessionId: string | null;
}

interface ConsumerAuthSession {
  sessionId: string;
  displayName: string;
  loginMethod: ConsumerLoginMethod;
  role: UserRole;
}

const DEVICE_KEY = 'vs-nepal-device';

const defaultAuth: AuthState = {
  loading: true,
  authenticated: false,
  walletAddress: null,
  displayName: '',
  deviceId: 'device-guest',
  avatarUrl: null,
  loginMethod: null,
  role: null,
  login: () => {},
  logout: () => {},
  setRole: () => {},
  hasSessionKey: false,
  sessionId: null,
};

const AuthContext = createContext<AuthState>(defaultAuth);

function getOrCreateDeviceId() {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) {
      return existing;
    }

    const next = `device-${crypto.randomUUID().slice(0, 10)}`;
    localStorage.setItem(DEVICE_KEY, next);
    return next;
  } catch {
    return `device-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [showModal, setShowModal] = useState(false);
  const [session, setSession] = useState<ConsumerAuthSession | null>(null);
  const [deviceId] = useState(() => (typeof window !== 'undefined' ? getOrCreateDeviceId() : 'device-guest'));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void fetchConsumerSession()
      .then((next) => {
        if (cancelled) {
          return;
        }
        if (!next.authenticated || !next.sessionId || !next.displayName) {
          throw new Error(next.reason ?? 'Consumer session is not available.');
        }

        setSession({
          sessionId: next.sessionId,
          displayName: next.displayName,
          loginMethod: next.loginMethod ?? 'guest',
          role: next.role ?? 'consumer',
        });
      })
      .catch(() => {
        if (!cancelled) {
          setSession(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHydrated(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(() => setShowModal(true), []);

  const logout = useCallback(() => {
    void rotateConsumerSession()
      .then((next) => {
        if (!next.authenticated || !next.sessionId || !next.displayName) {
          throw new Error(next.reason ?? 'Consumer session reset failed.');
        }

        setSession({
          sessionId: next.sessionId,
          displayName: next.displayName,
          loginMethod: next.loginMethod ?? 'guest',
          role: next.role ?? 'consumer',
        });
        setShowModal(false);
      })
      .catch(() => {
        setSession(null);
      });
  }, []);

  const setRole = useCallback((role: UserRole) => {
    void role;
    // Consumer role is session-backed now; path does not mutate authority.
  }, []);

  const value = useMemo<AuthState>(() => ({
    loading: !hydrated,
    authenticated: hydrated && Boolean(session?.sessionId),
    walletAddress: null,
    displayName: session?.displayName ?? '',
    deviceId,
    avatarUrl: null,
    loginMethod: session?.loginMethod ?? null,
    role: session?.role ?? null,
    login,
    logout,
    setRole,
    hasSessionKey: Boolean(session?.sessionId),
    sessionId: session?.sessionId ?? null,
  }), [deviceId, hydrated, login, logout, session, setRole]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showModal && session && (
        <IdentitySheet
          session={session}
          onClose={() => setShowModal(false)}
          onSave={(displayName, loginMethod) => {
            void updateConsumerSession({ displayName, loginMethod })
              .then((next) => {
                if (!next.authenticated || !next.sessionId || !next.displayName) {
                  throw new Error(next.reason ?? 'Consumer session update failed.');
                }

                setSession({
                  sessionId: next.sessionId,
                  displayName: next.displayName,
                  loginMethod: next.loginMethod ?? loginMethod,
                  role: next.role ?? 'consumer',
                });
                setShowModal(false);
              })
              .catch(() => undefined);
          }}
        />
      )}
    </AuthContext.Provider>
  );
}

function IdentitySheet({
  session,
  onClose,
  onSave,
}: {
  session: ConsumerAuthSession;
  onClose: () => void;
  onSave: (displayName: string, loginMethod: ConsumerLoginMethod) => void;
}) {
  const [displayName, setDisplayName] = useState(session.displayName);

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="eyebrow">Passbook identity</div>
        <h3>Name this passbook</h3>
        <p>
          Identity is now backed by a signed server session instead of browser-only state.
          You can still start as a guest, then upgrade the label later if the launch needs it.
        </p>

        <div className="field-stack" style={{ marginTop: 18 }}>
          <div className="field">
            <label htmlFor="display-name">Display name</label>
            <input
              id="display-name"
              value={displayName}
              maxLength={28}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="How your friends should see you"
            />
          </div>

          <div className="cta-row">
            <button
              className="primary-button"
              onClick={() => onSave(displayName.trim() || session.displayName, 'guest')}
            >
              Save guest name
            </button>
            <button
              className="secondary-button"
              onClick={() => onSave(displayName.trim() || session.displayName, 'email')}
            >
              Mark for email upgrade
            </button>
            <button className="quiet-button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
