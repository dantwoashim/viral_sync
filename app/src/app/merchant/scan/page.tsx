'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Fingerprint, Keyboard, QrCode } from '@phosphor-icons/react';
import {
  PremiumAsyncState,
  PremiumMetric,
  PremiumNav,
  PremiumProofRow,
  PremiumShell,
  PremiumStatusBadge,
  PremiumSurface,
  PremiumTransactionPanel,
} from '@/components/premium/PremiumUi';
import { confirmMerchantCode, enrollStaffDeviceTerminal, fetchMerchantSummary, hasRememberedStaffDevice } from '@/lib/launch/client';
import type { MerchantSummary } from '@/lib/launch/types';

function normalizeStaffCode(value: string) {
  const raw = value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6);
  return raw.length > 3 ? `${raw.slice(0, 3)}-${raw.slice(3)}` : raw;
}

export default function MerchantScanPage() {
  const [summary, setSummary] = useState<MerchantSummary | null>(null);
  const [code, setCode] = useState('');
  const [staffPin, setStaffPin] = useState('');
  const [manualReceiptId, setManualReceiptId] = useState('');
  const [working, setWorking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [deviceReady, setDeviceReady] = useState(false);
  const [enrollingDevice, setEnrollingDevice] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'checking' | 'granted' | 'prompt' | 'denied' | 'unsupported'>('checking');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await fetchMerchantSummary());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Merchant queue could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDeviceReady(hasRememberedStaffDevice());
      void refresh();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;

    async function checkCameraPermission() {
      if (!('permissions' in navigator) || !navigator.permissions?.query) {
        setCameraPermission('unsupported');
        return;
      }

      try {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (!cancelled) {
          setCameraPermission(permission.state as 'granted' | 'prompt' | 'denied');
        }
        permission.onchange = () => {
          setCameraPermission(permission.state as 'granted' | 'prompt' | 'denied');
        };
      } catch {
        if (!cancelled) setCameraPermission('unsupported');
      }
    }

    void checkCameraPermission();

    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async () => {
    setWorking(true);
    setResult(null);
    setReceiptId(null);
    try {
      const response = await confirmMerchantCode(code, staffPin, manualReceiptId);
      if (!response.ok) {
        setResult(response.reason ?? 'Code could not be confirmed.');
        return;
      }
      setResult(response.receiptPda
        ? `Confirmed ${response.code}. Receipt ${response.receiptPda.slice(0, 18)}...`
        : response.status === 'redeemed' ? `Confirmed ${response.code}.` : `Code ${response.code} is ${response.status}.`);
      setReceiptId(response.receiptId ?? null);
      setCode('');
      setManualReceiptId('');
      await refresh();
    } finally {
      setWorking(false);
    }
  };

  const enrollTerminal = async () => {
    setEnrollingDevice(true);
    setResult(null);
    try {
      const response = await enrollStaffDeviceTerminal({
        staffPin,
        label: 'Counter terminal',
        locationLabel: summary?.merchant.locationLabel ?? 'Front counter',
      });
      if (!response.ok) {
        setResult(response.reason ?? 'Terminal enrollment failed.');
        return;
      }
      setDeviceReady(true);
      setResult('Terminal enrolled. Future confirmations will be signed by this device.');
    } catch (caught) {
      setResult(caught instanceof Error ? caught.message : 'Terminal enrollment failed.');
    } finally {
      setEnrollingDevice(false);
    }
  };

  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-utility-grid">
        <PremiumSurface tone="light" className="premium-system-section">
          <div className="premium-card-title">
            <span><Keyboard size={15} weight="bold" /> Manual confirmation</span>
            <h1 className="premium-h2">Enter the visitor code and confirm the visit.</h1>
          </div>
            <div className="premium-form">
              <div className="premium-field">
                <label htmlFor="redeem-code">Manual code</label>
                <input
                  className="premium-input"
                  id="redeem-code"
                  value={code}
                  onChange={(event) => setCode(normalizeStaffCode(event.target.value))}
                  placeholder="ABC-123"
                  maxLength={7}
                  inputMode="text"
                />
                <small>Six characters from the visitor redeem screen.</small>
              </div>
              <div className="premium-field">
                <label htmlFor="staff-pin">Staff PIN</label>
                <input
                  className="premium-input"
                  id="staff-pin"
                  value={staffPin}
                  onChange={(event) => setStaffPin(event.target.value)}
                  placeholder="DEMO-PIN"
                  autoComplete="off"
                />
                <small>{deviceReady ? 'This terminal signs confirmations with its enrolled device key.' : 'Use once to enroll this terminal, then confirmations are device-signed.'}</small>
              </div>
              <div className="premium-actions">
                <button className="premium-button premium-button-primary" onClick={submit} disabled={working || code.trim().length < 6}>
                  {working ? 'Checking code' : 'Confirm visit'}
                  <CheckCircle size={17} weight="bold" />
                </button>
                <button className="premium-button premium-button-secondary" type="button" onClick={enrollTerminal} disabled={enrollingDevice || !staffPin.trim()}>
                  {enrollingDevice ? 'Enrolling' : deviceReady ? 'Re-enroll terminal' : 'Enroll terminal'}
                  <Fingerprint size={16} weight="bold" />
                </button>
                <button className="premium-button premium-button-secondary" type="button" onClick={() => setCode('')}>Clear</button>
                <button className="premium-button premium-button-quiet" type="button" onClick={() => void refresh()}>Refresh queue</button>
              </div>
              <div className="premium-field">
                <label htmlFor="manual-receipt-id">Receipt ID</label>
                <input
                  className="premium-input"
                  id="manual-receipt-id"
                  value={manualReceiptId}
                  onChange={(event) => setManualReceiptId(event.target.value.toUpperCase())}
                  placeholder="Optional bill reference"
                  autoComplete="off"
                />
                <small>Optional POS/bill reference for stronger evidence.</small>
              </div>
            </div>
        </PremiumSurface>

        <div className="premium-hero-copy">
          <span className="premium-eyebrow">Staff scan</span>
          <h2 className="premium-h2">Confirm a visitor code.</h2>
          <p className="premium-lede">
            Camera scan is optional until permission QA is complete. Manual code entry is the
            first-fold path because it works when the counter is busy, loud, or offline.
          </p>
          {error ? (
            <PremiumAsyncState tone="error" title="Merchant queue failed" detail={error} />
          ) : (
            <PremiumAsyncState
              tone={result ? 'success' : cameraPermission === 'denied' ? 'error' : 'empty'}
              title={result ? 'Confirmation result' : cameraPermission === 'denied' ? 'Camera permission denied' : 'Manual fallback ready'}
              detail={result ?? (cameraPermission === 'denied'
                ? 'Use manual entry. The counter can still confirm visits without camera access.'
                : 'QR scan can be layered on top; manual entry remains the reliable counter path.')}
              action={receiptId ? <Link className="premium-button premium-button-secondary" href={`/receipts/${encodeURIComponent(receiptId)}`}>Open receipt proof</Link> : null}
            />
          )}

          <PremiumTransactionPanel eyebrow={summary ? 'Merchant terminal online' : 'Merchant terminal'} title={summary?.merchant.name ?? 'Counter terminal'}>
            <PremiumProofRow label="Location" value={summary?.merchant.locationLabel ?? 'Loading'} meta={summary?.merchant.district ?? 'Pilot district'} status={summary ? 'success' : 'warning'} />
            <PremiumProofRow label="Live queue" value={summary?.metrics[2]?.value ?? '0'} meta="Awaiting staff action" status="warning" />
            <PremiumProofRow label="Redemptions" value={summary?.metrics[1]?.value ?? '0'} meta="Confirmed today" status="success" />
            <PremiumProofRow label="Held out" value={summary?.metrics[3]?.value ?? '0'} meta="Needs review" status="danger" />
            <div className="premium-component-row">
              <PremiumStatusBadge tone={loading ? 'warning' : 'success'}>{loading ? 'Loading queue' : 'Queue loaded'}</PremiumStatusBadge>
              <PremiumStatusBadge tone={deviceReady ? 'success' : 'warning'}><Fingerprint size={13} weight="bold" /> {deviceReady ? 'Device enrolled' : 'Enroll device'}</PremiumStatusBadge>
              <PremiumStatusBadge tone={cameraPermission === 'denied' ? 'warning' : 'muted'}><QrCode size={13} weight="bold" /> {cameraPermission === 'denied' ? 'Manual mode' : 'Camera optional'}</PremiumStatusBadge>
            </div>
          </PremiumTransactionPanel>
        </div>
      </section>

      <section className="premium-metrics" aria-label="Staff scan proof posture">
        <PremiumMetric label="Permission state" value="Manual" detail="No blocked camera prompt can stop confirmation." />
        <PremiumMetric label="Receipt path" value="Linked" detail="Confirmed visits link to public proof." />
        <PremiumMetric label="Input safety" value="Normalized" detail="Codes are formatted before submission." />
      </section>
    </PremiumShell>
  );
}
