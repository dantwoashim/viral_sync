'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { PublicKey } from '@solana/web3.js';

export type UserRole = 'consumer' | 'merchant' | null;
type LoginMethod = 'guest' | 'email' | 'google' | null;

interface StoredSession {
  sessionId: string;
  displayName: string;
  loginMethod: LoginMethod;
  role: UserRole;
}

export interface AuthState {
  loading: boolean;
  authenticated: boolean;
  walletAddress: PublicKey | null;
  displayName: string;
  deviceId: string;
  avatarUrl: string | null;
  loginMethod: LoginMethod;
  role: UserRole;
  login: () => void;
  logout: () => void;
  setRole: (role: UserRole) => void;
  hasSessionKey: boolean;
  sessionId: string | null;
}

const STORAGE_KEY = 'vs-nepal-session';
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

function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as StoredSession;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function writeSession(session: StoredSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function buildGuestSession(role: UserRole = null): StoredSession {
  const seed = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()
    : Math.random().toString(36).slice(2, 8).toUpperCase();

  return {
    sessionId: `vs-${Date.now().toString(36)}-${seed.toLowerCase()}`,
    displayName: `Guest ${seed.slice(0, 3)}`,
    loginMethod: 'guest',
    role,
  };
}

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
  const [session, setSession] = useState<StoredSession | null>(null);
  const [deviceId, setDeviceId] = useState('device-guest');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = readSession();
    const nextSession = saved ?? buildGuestSession();
    const nextDeviceId = getOrCreateDeviceId();
    writeSession(nextSession);
    queueMicrotask(() => {
      setSession(nextSession);
      setDeviceId(nextDeviceId);
      setHydrated(true);
    });
  }, []);

  const persistSession = useCallback((updater: (current: StoredSession) => StoredSession) => {
    setSession((current) => {
      const next = updater(current ?? buildGuestSession());
      writeSession(next);
      return next;
    });
  }, []);

  const login = useCallback(() => setShowModal(true), []);

  const logout = useCallback(() => {
    const nextGuest = buildGuestSession();
    writeSession(nextGuest);
    setSession(nextGuest);
    setShowModal(false);
  }, []);

  const setRole = useCallback((role: UserRole) => {
    persistSession((current) => ({
      ...current,
      role,
    }));
  }, [persistSession]);

  const value = useMemo<AuthState>(() => ({
    loading: !hydrated,
    authenticated: hydrated,
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
            persistSession((current) => ({
              ...current,
              displayName,
              loginMethod,
            }));
            setShowModal(false);
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
  session: StoredSession;
  onClose: () => void;
  onSave: (displayName: string, loginMethod: LoginMethod) => void;
}) {
  const [displayName, setDisplayName] = useState(session.displayName);

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="eyebrow">Passbook identity</div>
        <h3>Name this passbook</h3>
        <p>
          The Nepal launch starts guest-first. You can move around the product without OTP cost,
          then attach a stronger identity later when the pilot earns the right to add more.
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
