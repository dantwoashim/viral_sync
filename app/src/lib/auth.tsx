'use client';

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Keypair, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import {
    DEMO_MODE_ENABLED,
    MERCHANT_MINT,
    MERCHANT_PUBKEY,
    findTokenGenerationPda,
    shortenAddress,
} from './solana';
import {
    bootstrapSession,
    clearStoredOperatorSession,
    decodeTransaction,
    requestSessionChallenge,
    submitPreparedTransaction,
} from './runtime';
import { getTestWalletOptions } from './test-wallet';
import {
    destroySessionKey,
    getOrCreateSessionKey,
    getSessionKeyInfo,
    markSessionKeyRegistered,
} from './session-keys';

export type UserRole = 'consumer' | 'merchant' | null;
export type LoginMethod = 'wallet' | 'demo' | null;

export interface AuthState {
    loading: boolean;
    authenticated: boolean;
    walletAddress: PublicKey | null;
    displayName: string;
    avatarUrl: string | null;
    loginMethod: LoginMethod;
    role: UserRole;
    login: () => void;
    logout: () => Promise<void>;
    setRole: (role: UserRole) => void;
    hasSessionKey: boolean;
    signMessage: (message: Uint8Array) => Promise<Uint8Array>;
    signTransaction: (transaction: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
}

interface PersistedSession {
    walletAddress: string;
    displayName: string;
    loginMethod: Exclude<LoginMethod, null>;
    role: UserRole;
    providerId?: string;
    providerLabel: string;
    issuedAt: number;
    expiresAt: number;
    proof: string;
}

interface WalletConnectResult {
    publicKey?: PublicKey;
}

interface InjectedWalletProvider {
    publicKey?: PublicKey;
    isPhantom?: boolean;
    isSolflare?: boolean;
    isBackpack?: boolean;
    connect: (options?: { onlyIfTrusted?: boolean }) => Promise<WalletConnectResult>;
    disconnect?: () => Promise<void>;
    signMessage?: (message: Uint8Array) => Promise<Uint8Array | { signature: Uint8Array }>;
    signTransaction?: (transaction: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
}

interface WalletOption {
    id: string;
    label: string;
    provider: InjectedWalletProvider;
}

declare global {
    interface Window {
        solana?: InjectedWalletProvider;
        phantom?: { solana?: InjectedWalletProvider };
        solflare?: InjectedWalletProvider;
        backpack?: { solana?: InjectedWalletProvider };
    }
}

const AUTH_STORAGE_KEY = 'vs-auth-session';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

const defaultAuth: AuthState = {
    loading: true,
    authenticated: false,
    walletAddress: null,
    displayName: '',
    avatarUrl: null,
    loginMethod: null,
    role: null,
    login: () => { },
    logout: async () => { },
    setRole: () => { },
    hasSessionKey: false,
    signMessage: async () => {
        throw new Error('Wallet message signing is not available.');
    },
    signTransaction: async () => {
        throw new Error('Wallet transaction signing is not available.');
    },
};

const AuthContext = createContext<AuthState>(defaultAuth);
export const useAuth = () => useContext(AuthContext);

function encodeBase64(input: Uint8Array): string {
    if (typeof window === 'undefined') {
        return Buffer.from(input).toString('base64');
    }
    let binary = '';
    input.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return window.btoa(binary);
}

function detectWallets(): WalletOption[] {
    if (typeof window === 'undefined') {
        return [];
    }

    const options: WalletOption[] = [];
    const seen = new Set<InjectedWalletProvider>();

    const add = (id: string, label: string, provider?: InjectedWalletProvider) => {
        if (!provider || seen.has(provider)) {
            return;
        }
        seen.add(provider);
        options.push({ id, label, provider });
    };

    add('phantom', 'Phantom', window.phantom?.solana ?? (window.solana?.isPhantom ? window.solana : undefined));
    add('solflare', 'Solflare', window.solflare ?? (window.solana?.isSolflare ? window.solana : undefined));
    add('backpack', 'Backpack', window.backpack?.solana ?? (window.solana?.isBackpack ? window.solana : undefined));
    add('browser-wallet', 'Browser Wallet', window.solana);
    getTestWalletOptions().forEach((wallet) => add(wallet.id, wallet.label, wallet.provider));

    return options;
}

function isPersistedSession(value: unknown): value is PersistedSession {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const candidate = value as Partial<PersistedSession>;
    return typeof candidate.walletAddress === 'string'
        && typeof candidate.displayName === 'string'
        && (candidate.loginMethod === 'wallet' || candidate.loginMethod === 'demo')
        && typeof candidate.providerLabel === 'string'
        && (candidate.providerId === undefined || typeof candidate.providerId === 'string')
        && typeof candidate.issuedAt === 'number'
        && typeof candidate.expiresAt === 'number'
        && typeof candidate.proof === 'string';
}

function getWalletDisplayName(providerLabel: string, walletAddress: string): string {
    return `${providerLabel} ${shortenAddress(walletAddress)}`;
}

function createNonSecretDemoProof(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return encodeBase64(bytes);
}

function persistSession(session: PersistedSession) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    if (session.role) {
        localStorage.setItem('vs-user-role', session.role);
    }
}

function clearPersistedSession() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem('vs-user-role');
}

async function restoreWalletProvider(session: PersistedSession): Promise<InjectedWalletProvider | null> {
    if (typeof window === 'undefined' || session.loginMethod !== 'wallet') {
        return null;
    }

    const wallets = detectWallets();
    const matchedWallet = wallets.find((wallet) => wallet.id === session.providerId)
        ?? wallets.find((wallet) => wallet.label === session.providerLabel);
    if (!matchedWallet) {
        return null;
    }

    const provider = matchedWallet.provider;
    const connectedKey = provider.publicKey;
    if (connectedKey?.toBase58() === session.walletAddress) {
        return provider;
    }

    try {
        const connected = await provider.connect({ onlyIfTrusted: true });
        const publicKey = provider.publicKey ?? connected.publicKey;
        return publicKey?.toBase58() === session.walletAddress ? provider : null;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);
    const [walletAddress, setWalletAddress] = useState<PublicKey | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [loginMethod, setLoginMethod] = useState<LoginMethod>(null);
    const [role, setRole] = useState<UserRole>(null);
    const [showModal, setShowModal] = useState(false);
    const [hasSessionKey, setHasSessionKey] = useState(false);
    const providerRef = useRef<InjectedWalletProvider | null>(null);

    const applySession = useCallback((session: PersistedSession) => {
        setWalletAddress(new PublicKey(session.walletAddress));
        setDisplayName(session.displayName);
        setLoginMethod(session.loginMethod);
        setRole(session.role);
        setAuthenticated(true);
        setHasSessionKey(Boolean(getSessionKeyInfo()));
    }, []);

    useEffect(() => {
        let cancelled = false;

        const restore = async () => {
            try {
                const raw = localStorage.getItem(AUTH_STORAGE_KEY);
                if (!raw) {
                    setHasSessionKey(Boolean(getSessionKeyInfo()));
                    return;
                }

                const parsed: unknown = JSON.parse(raw);
                if (!isPersistedSession(parsed) || parsed.expiresAt <= Date.now()) {
                    clearPersistedSession();
                    destroySessionKey();
                    setHasSessionKey(false);
                    providerRef.current = null;
                    return;
                }

                if (parsed.loginMethod === 'wallet') {
                    const restoredProvider = await restoreWalletProvider(parsed);
                    if (!restoredProvider) {
                        clearPersistedSession();
                        destroySessionKey();
                        setHasSessionKey(false);
                        providerRef.current = null;
                        setAuthenticated(false);
                        setWalletAddress(null);
                        setDisplayName('');
                        setLoginMethod(null);
                        setRole(null);
                        return;
                    }
                    providerRef.current = restoredProvider;
                }

                if (!cancelled) {
                    applySession(parsed);
                }
            } catch {
                clearPersistedSession();
                destroySessionKey();
                setHasSessionKey(false);
                providerRef.current = null;
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void restore();

        return () => {
            cancelled = true;
        };
    }, [applySession]);

    const login = useCallback(() => setShowModal(true), []);

    const logout = useCallback(async () => {
        try {
            await providerRef.current?.disconnect?.();
        } catch {
            // Wallet disconnect failure should not block local session teardown.
        }

        providerRef.current = null;
        destroySessionKey();
        clearStoredOperatorSession();
        clearPersistedSession();
        setAuthenticated(false);
        setWalletAddress(null);
        setDisplayName('');
        setLoginMethod(null);
        setRole(null);
        setHasSessionKey(false);
    }, []);

    const handleSetRole = useCallback((nextRole: UserRole) => {
        setRole(nextRole);
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (raw) {
            try {
                const parsed: unknown = JSON.parse(raw);
                if (isPersistedSession(parsed)) {
                    parsed.role = nextRole;
                    persistSession(parsed);
                }
            } catch {
                clearPersistedSession();
            }
        } else if (nextRole) {
            localStorage.setItem('vs-user-role', nextRole);
        } else {
            localStorage.removeItem('vs-user-role');
        }
    }, []);

    const signTransaction = useCallback(async (
        transaction: Transaction | VersionedTransaction
    ): Promise<Transaction | VersionedTransaction> => {
        if (!providerRef.current?.signTransaction) {
            throw new Error('The connected wallet does not expose transaction signing in this browser.');
        }
        return providerRef.current.signTransaction(transaction);
    }, []);

    const signMessage = useCallback(async (message: Uint8Array): Promise<Uint8Array> => {
        if (!providerRef.current?.signMessage) {
            throw new Error('The connected wallet does not expose message signing in this browser.');
        }
        const signatureResponse = await providerRef.current.signMessage(message);
        return signatureResponse instanceof Uint8Array
            ? signatureResponse
            : signatureResponse.signature;
    }, []);

    const handleWalletLogin = useCallback(async (wallet: WalletOption) => {
        if (!wallet.provider.signMessage || !wallet.provider.signTransaction) {
            throw new Error(`${wallet.label} must support message and transaction signing for live sessions.`);
        }
        if (!MERCHANT_MINT || !MERCHANT_PUBKEY) {
            throw new Error('NEXT_PUBLIC_MERCHANT_MINT and NEXT_PUBLIC_MERCHANT_PUBKEY must be configured for live wallet sessions.');
        }

        const connected = await wallet.provider.connect({ onlyIfTrusted: false });
        const publicKey = wallet.provider.publicKey ?? connected.publicKey;
        if (!publicKey) {
            throw new Error(`Unable to read a public key from ${wallet.label}.`);
        }

        providerRef.current = wallet.provider;

        const issuedAt = Date.now();
        const { info: sessionKey } = getOrCreateSessionKey();
        const [generation] = findTokenGenerationPda(MERCHANT_MINT, publicKey);
        const challenge = await requestSessionChallenge({
            wallet: publicKey.toBase58(),
            delegate: sessionKey.publicKey.toBase58(),
            generation: generation.toBase58(),
            mint: MERCHANT_MINT.toBase58(),
            merchant: MERCHANT_PUBKEY.toBase58(),
            origin: window.location.origin,
        });
        const signatureResponse = await wallet.provider.signMessage(
            new TextEncoder().encode(challenge.challengeMessage)
        );
        const signature = signatureResponse instanceof Uint8Array
            ? signatureResponse
            : signatureResponse.signature;
        const bootstrap = await bootstrapSession({
            challengeId: challenge.challengeId,
            signatureBase64: encodeBase64(signature),
            requestedSessionExpiry: sessionKey.expiresAt,
        });
        const bootstrapTx = decodeTransaction(bootstrap.transactionBase64);
        const signedBootstrapTx = await wallet.provider.signTransaction(bootstrapTx);
        const relayResult = await submitPreparedTransaction(
            'session-key-issue',
            signedBootstrapTx as Transaction,
            publicKey,
            bootstrap.merchant,
            challenge.challengeId
        );
        if (!relayResult.success || !relayResult.signature) {
            throw new Error(relayResult.error || 'Failed to register the session key on-chain.');
        }
        markSessionKeyRegistered();

        const session: PersistedSession = {
            walletAddress: publicKey.toBase58(),
            displayName: getWalletDisplayName(wallet.label, publicKey.toBase58()),
            loginMethod: 'wallet',
            role,
            providerId: wallet.id,
            providerLabel: wallet.label,
            issuedAt,
            expiresAt: Math.min(issuedAt + SESSION_TTL_MS, bootstrap.expiresAt),
            proof: encodeBase64(signature),
        };

        persistSession(session);
        applySession(session);
        setShowModal(false);
    }, [applySession, role]);

    const handleDemoLogin = useCallback(async (name: string) => {
        if (!DEMO_MODE_ENABLED) {
            throw new Error('Demo mode is disabled for this deployment.');
        }

        const demoKeypair = Keypair.generate();
        getOrCreateSessionKey();

        const session: PersistedSession = {
            walletAddress: demoKeypair.publicKey.toBase58(),
            displayName: name.trim() || 'Demo Workspace',
            loginMethod: 'demo',
            role,
            providerLabel: 'Demo',
            issuedAt: Date.now(),
            expiresAt: Date.now() + SESSION_TTL_MS,
            proof: createNonSecretDemoProof(),
        };

        persistSession(session);
        applySession(session);
        setShowModal(false);
    }, [applySession, role]);

    const value = useMemo<AuthState>(() => ({
        loading,
        authenticated,
        walletAddress,
        displayName,
        avatarUrl: null,
        loginMethod,
        role,
        login,
        logout,
        setRole: handleSetRole,
        hasSessionKey,
        signMessage,
        signTransaction,
    }), [
        loading,
        authenticated,
        walletAddress,
        displayName,
        loginMethod,
        role,
        login,
        logout,
        handleSetRole,
        hasSessionKey,
        signMessage,
        signTransaction,
    ]);

    return (
        <AuthContext.Provider value={value}>
            {children}
            {showModal && (
                <LoginModal
                    allowDemo={DEMO_MODE_ENABLED}
                    onClose={() => setShowModal(false)}
                    onWalletLogin={handleWalletLogin}
                    onDemoLogin={handleDemoLogin}
                />
            )}
        </AuthContext.Provider>
    );
}

function LoginModal({
    allowDemo,
    onClose,
    onWalletLogin,
    onDemoLogin,
}: {
    allowDemo: boolean;
    onClose: () => void;
    onWalletLogin: (wallet: WalletOption) => Promise<void>;
    onDemoLogin: (name: string) => Promise<void>;
}) {
    const [wallets, setWallets] = useState<WalletOption[]>([]);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [demoName, setDemoName] = useState('Demo Workspace');

    useEffect(() => {
        setWallets(detectWallets());
    }, []);

    const connectWallet = async (wallet: WalletOption) => {
        setBusyId(wallet.id);
        setError(null);
        try {
            await onWalletLogin(wallet);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Wallet connection failed.');
        } finally {
            setBusyId(null);
        }
    };

    const launchDemo = async () => {
        setBusyId('demo');
        setError(null);
        try {
            await onDemoLogin(demoName);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Demo session failed.');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                background: 'rgba(8, 10, 14, 0.56)',
                backdropFilter: 'blur(18px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
            }}
            onClick={onClose}
            data-testid="login-modal"
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: 520,
                    borderRadius: 28,
                    border: '1px solid rgba(255,255,255,0.10)',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.94))',
                    boxShadow: '0 30px 120px rgba(8, 10, 14, 0.28)',
                    overflow: 'hidden',
                }}
                onClick={(event) => event.stopPropagation()}
            >
                <div
                    style={{
                        padding: '28px 28px 22px',
                        background: 'radial-gradient(circle at top left, rgba(45,138,99,0.18), transparent 42%), radial-gradient(circle at top right, rgba(230,168,23,0.16), transparent 34%)',
                        borderBottom: '1px solid rgba(17,24,39,0.06)',
                    }}
                >
                    <div
                        style={{
                            width: 54,
                            height: 54,
                            borderRadius: 18,
                            background: 'linear-gradient(135deg, #111827, #2D8A63)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 18,
                            marginBottom: 16,
                        }}
                    >
                        VS
                    </div>
                    <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>Secure sign-in</h2>
                    <p style={{ marginTop: 8, fontSize: 14, color: '#4B5563', lineHeight: 1.6 }}>
                        {DEMO_MODE_ENABLED
                            ? 'Wallet signatures power live sessions. Demo access stays clearly separated when enabled.'
                            : 'Wallet signatures are required for all sessions in this deployment.'}
                    </p>
                </div>

                <div style={{ padding: 28, display: 'grid', gap: 18 }}>
                    <div style={{ display: 'grid', gap: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280' }}>
                            Wallet Sign-In
                        </div>
                        {wallets.length > 0 ? wallets.map((wallet) => (
                            <button
                                key={wallet.id}
                                onClick={() => void connectWallet(wallet)}
                                disabled={busyId !== null}
                                data-testid={`wallet-option-${wallet.id}`}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 12,
                                    padding: '16px 18px',
                                    borderRadius: 18,
                                    border: '1px solid rgba(17,24,39,0.08)',
                                    background: 'white',
                                    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.05)',
                                }}
                            >
                                <span style={{ fontWeight: 700, color: '#111827' }}>{wallet.label}</span>
                                <span style={{ fontSize: 13, color: '#2D8A63', fontWeight: 600 }}>
                                    {busyId === wallet.id ? 'Connecting...' : 'Connect'}
                                </span>
                            </button>
                        )) : (
                            <div
                                style={{
                                    padding: '16px 18px',
                                    borderRadius: 18,
                                    border: '1px dashed rgba(17,24,39,0.14)',
                                    background: 'rgba(248,250,252,0.9)',
                                    color: '#4B5563',
                                    fontSize: 14,
                                    lineHeight: 1.6,
                                }}
                            >
                                No injected Solana wallet was detected. Install Phantom, Solflare, or Backpack to access the live product.
                            </div>
                        )}
                    </div>

                    {allowDemo && (
                        <div style={{ display: 'grid', gap: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280' }}>
                                Demo Sandbox
                            </div>
                            <input
                                type="text"
                                value={demoName}
                                onChange={(event) => setDemoName(event.target.value)}
                                placeholder="Demo workspace name"
                                disabled={busyId !== null}
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    borderRadius: 16,
                                    border: '1px solid rgba(17,24,39,0.08)',
                                    background: 'rgba(248,250,252,0.92)',
                                    color: '#111827',
                                    outline: 'none',
                                }}
                            />
                            <button
                                onClick={() => void launchDemo()}
                                disabled={busyId !== null}
                                data-testid="demo-login-button"
                                style={{
                                    padding: '16px 18px',
                                    borderRadius: 18,
                                    background: 'linear-gradient(135deg, #2D8A63, #163A2A)',
                                    color: 'white',
                                    fontWeight: 700,
                                    boxShadow: '0 18px 36px rgba(45,138,99,0.24)',
                                }}
                            >
                                {busyId === 'demo' ? 'Launching demo...' : 'Enter demo mode'}
                            </button>
                        </div>
                    )}

                    {error && (
                        <div
                            style={{
                                padding: '14px 16px',
                                borderRadius: 16,
                                border: '1px solid rgba(220,53,69,0.16)',
                                background: 'rgba(220,53,69,0.08)',
                                color: '#991B1B',
                                fontSize: 13,
                                lineHeight: 1.5,
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                        <div style={{ fontSize: 12, color: '#6B7280' }}>
                            Session keys stay in memory only for the current tab and are never persisted to browser storage.
                        </div>
                        <button
                            onClick={onClose}
                            disabled={busyId !== null}
                            data-testid="login-modal-close"
                            style={{
                                padding: '10px 14px',
                                borderRadius: 14,
                                background: 'rgba(15,23,42,0.05)',
                                color: '#111827',
                                fontWeight: 600,
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
