'use client';

import React, { useState } from 'react';
import { Camera, CheckCircle, ExternalLink, LocateFixed, QrCode, XCircle, Zap } from 'lucide-react';
import { Transaction } from '@solana/web3.js';
import { useAuth } from '@/lib/auth';
import { decodeTransaction, getOrCreateDeviceId, prepareRedemption, submitPreparedTransaction } from '@/lib/runtime';
import { explorerUrl, shortenAddress } from '@/lib/solana';
import { getTestGeoOverride } from '@/lib/test-wallet';

type ScanState = 'idle' | 'locating' | 'preparing' | 'signing' | 'submitting' | 'success' | 'error';

function readGeoPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
        const override = getTestGeoOverride();
        if (override) {
            resolve({
                coords: {
                    latitude: override.latitude,
                    longitude: override.longitude,
                    accuracy: 1,
                    altitude: null,
                    altitudeAccuracy: null,
                    heading: null,
                    speed: null,
                    toJSON: () => ({}),
                },
                timestamp: Date.now(),
                toJSON: () => ({}),
            } as GeolocationPosition);
            return;
        }

        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not available in this browser.'));
            return;
        }

        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10_000,
            maximumAge: 0,
        });
    });
}

export default function ScanPage() {
    const { walletAddress, signTransaction, login } = useAuth();
    const [state, setState] = useState<ScanState>('idle');
    const [inputCode, setInputCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [signature, setSignature] = useState<string | null>(null);

    const handleScan = async () => {
        if (!walletAddress) {
            login();
            return;
        }
        if (!inputCode.trim()) {
            setError('Enter the POS redemption code first.');
            setState('error');
            return;
        }

        try {
            setError(null);
            setSignature(null);
            setState('locating');
            const position = await readGeoPosition();
            setState('preparing');
            const prepared = await prepareRedemption({
                code: inputCode.trim().toUpperCase(),
                wallet: walletAddress.toBase58(),
                latMicro: Math.round(position.coords.latitude * 1_000_000),
                lngMicro: Math.round(position.coords.longitude * 1_000_000),
                deviceId: getOrCreateDeviceId(),
            });
            setState('signing');
            const tx = decodeTransaction(prepared.transactionBase64);
            const signedTx = await signTransaction(tx);
            setState('submitting');
            const result = await submitPreparedTransaction(
                'geo-redeem',
                signedTx as Transaction,
                walletAddress,
                prepared.merchant,
                prepared.challengeId
            );
            if (!result.success || !result.signature) {
                throw new Error(result.error || 'Relayer submission failed.');
            }

            setSignature(result.signature);
            setState('success');
        } catch (scanError) {
            setError(scanError instanceof Error ? scanError.message : 'Redemption preparation failed.');
            setState('error');
        }
    };

    const heading = state === 'success'
        ? 'Redemption Submitted'
        : state === 'error'
            ? 'Unable to Submit'
            : state === 'locating'
                ? 'Finding Your Location'
                : state === 'preparing'
                    ? 'Preparing Geo Proof'
                    : state === 'signing'
                        ? 'Awaiting Wallet Signature'
                        : state === 'submitting'
                            ? 'Submitting to Relayer'
                            : 'Scan to Redeem';

    const description = state === 'success'
        ? 'The geo-verified redemption transaction was sent successfully. The transaction signature is below.'
        : state === 'error'
            ? error || 'The code was invalid, expired, or the runtime rejected the request.'
            : state === 'locating'
                ? 'Allow location access so the action server can prepare a fresh geo attestation.'
                : state === 'preparing'
                    ? 'Building the one-time redemption transaction for this POS code.'
                    : state === 'signing'
                        ? 'Approve the wallet prompt to sign the prepared transaction.'
                        : state === 'submitting'
                            ? 'Submitting the signed transaction through the merchant-funded runtime.'
                            : 'Enter the one-time code shown on the POS terminal to begin the live redemption flow.';

    return (
        <>
            <div className="page-top">
                <h1>Scan</h1>
                {walletAddress && <div className="pill pill-gold">{shortenAddress(walletAddress.toBase58())}</div>}
            </div>

            <div className="page-scroll">
                <div className="scroll-card" style={{ padding: 'var(--s6)', textAlign: 'center' }}>
                    <div style={{
                        width: 140,
                        height: 140,
                        borderRadius: '50%',
                        border: `2px solid ${state === 'success' ? 'var(--jade)' : state === 'error' ? 'var(--crimson)' : 'var(--gold)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto var(--s5)',
                        boxShadow: state === 'idle' ? '0 0 20px var(--gold-glow)' : '0 0 40px var(--gold-glow)',
                        animation: state === 'success' ? 'none' : 'breathe 1.8s ease-in-out infinite',
                    }}>
                        {state === 'success' ? <CheckCircle size={48} color="var(--jade)" /> :
                            state === 'error' ? <XCircle size={48} color="var(--crimson)" /> :
                                state === 'locating' ? <LocateFixed size={48} color="var(--gold)" /> :
                                    state === 'preparing' || state === 'signing' || state === 'submitting'
                                        ? <Zap size={48} color="var(--gold)" />
                                        : <QrCode size={48} color="var(--gold)" style={{ opacity: 0.5 }} />}
                    </div>

                    <h2 style={{ fontFamily: 'var(--font-serif)', marginBottom: 4 }}>{heading}</h2>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', maxWidth: 320, margin: '0 auto' }}>
                        {description}
                    </p>
                </div>

                <div className="scroll-card" style={{ padding: 'var(--s5)', marginTop: 'var(--s4)' }}>
                    <h3 style={{ marginBottom: 'var(--s3)' }}>
                        <Camera size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                        Enter Redemption Code
                    </h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input
                            type="text"
                            value={inputCode}
                            onChange={(event) => setInputCode(event.target.value.toUpperCase())}
                            placeholder="ABCD1234"
                            data-testid="scan-code-input"
                            style={{
                                flex: 1,
                                padding: '12px 14px',
                                background: 'var(--mist-strong)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--text-1)',
                                fontFamily: 'var(--font-mono)',
                                fontSize: 14,
                                outline: 'none',
                            }}
                            onFocus={(event) => { event.target.style.borderColor = 'var(--border-gold)'; }}
                            onBlur={(event) => { event.target.style.borderColor = 'var(--border)'; }}
                        />
                        <button
                            onClick={() => void handleScan()}
                            disabled={state !== 'idle' && state !== 'error' && state !== 'success'}
                            data-testid="scan-start-button"
                            style={{
                                padding: '12px 20px',
                                background: state === 'idle' || state === 'error' || state === 'success'
                                    ? 'linear-gradient(135deg, var(--gold), var(--dawn))'
                                    : 'var(--mist-strong)',
                                color: state === 'idle' || state === 'error' || state === 'success'
                                    ? 'var(--ink)'
                                    : 'var(--text-3)',
                                borderRadius: 'var(--radius-sm)',
                                fontWeight: 700,
                                fontSize: 14,
                                opacity: state === 'idle' || state === 'error' || state === 'success' ? 1 : 0.7,
                            }}
                        >
                            {state === 'idle' || state === 'error' || state === 'success' ? 'Start' : '...'}
                        </button>
                    </div>
                </div>

                <div className="section" style={{ marginTop: 'var(--s5)' }}>
                    <div className="scroll-card" style={{ padding: 'var(--s4)', display: 'grid', gap: 'var(--s3)' }}>
                        <div className="metric-row">
                            <span className="metric-label">Live runtime</span>
                            <span className="metric-value" style={{ fontSize: 12 }}>
                                {walletAddress ? 'Wallet connected' : 'Wallet required'}
                            </span>
                        </div>
                        {signature ? (
                            <a
                                href={explorerUrl(signature, 'tx')}
                                target="_blank"
                                rel="noreferrer"
                                data-testid="scan-signature-link"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 12,
                                    padding: '12px 14px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-1)',
                                    textDecoration: 'none',
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 12,
                                }}
                            >
                                <span>{shortenAddress(signature, 6)}</span>
                                <ExternalLink size={14} />
                            </a>
                        ) : (
                            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                                The POS issues a short-lived code. This screen requests your location, prepares the full
                                geo-verified redemption transaction, signs it, and submits it using the merchant-funded runtime.
                            </div>
                        )}
                        {error && state === 'error' && (
                            <div style={{
                                padding: '12px 14px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--crimson-soft)',
                                color: 'var(--crimson)',
                                fontSize: 13,
                            }}>
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ height: 'var(--s8)' }} />
            </div>
        </>
    );
}
