'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Fingerprint,
  IdentificationCard,
  SignOut,
  UserCircle,
} from '@phosphor-icons/react';
import SignalRibbon from '@/components/launch/SignalRibbon';
import { useAuth } from '@/lib/auth';

export default function ProfilePage() {
  const { deviceId, displayName, login, loginMethod, logout, role, sessionId } = useAuth();
  const sessionTail = sessionId ? sessionId.slice(-8).toUpperCase() : 'PENDING';
  const deviceTail = deviceId ? deviceId.slice(-8).toUpperCase() : 'UNKNOWN';
  const activeRole = role ?? 'consumer';
  const activeMethod = loginMethod ?? 'guest';
  const ribbonItems = [
    `${displayName || 'Guest'} passbook`,
    `${activeRole} mode`,
    `${activeMethod} identity`,
    `device ${deviceTail}`,
  ];

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Profile</div>
            <h1 className="surface-title">Guest-first identity, upgrade later.</h1>
            <p className="surface-subtitle">
              The launch product avoids paid OTP and complex wallet flows. Identity starts lightweight, then upgrades only after the pilot proves itself.
            </p>
          </div>
        </div>

        <SignalRibbon items={ribbonItems} />

        <div className="split-grid" style={{ marginTop: 18 }}>
          <section className="ticket-sheet sheet-pad profile-card">
            <div className="eyebrow">Current passbook</div>
            <div className="profile-card-head">
              <UserCircle size={60} weight="duotone" />
              <div>
                <div className="profile-name">{displayName || 'Guest'}</div>
                <div className="ticket-note" style={{ marginTop: 6 }}>
                  Identity stays lightweight until the pilot earns a more expensive trust layer.
                </div>
              </div>
            </div>

            <div className="profile-fact-grid">
              <div className="profile-fact">
                <IdentificationCard size={18} />
                <div>
                  <strong>Session</strong>
                  <span>{sessionTail}</span>
                </div>
              </div>
              <div className="profile-fact">
                <Fingerprint size={18} />
                <div>
                  <strong>Device cluster</strong>
                  <span>{deviceTail}</span>
                </div>
              </div>
              <div className="profile-fact">
                <IdentificationCard size={18} />
                <div>
                  <strong>Identity mode</strong>
                  <span>{activeMethod}</span>
                </div>
              </div>
              <div className="profile-fact">
                <ArrowRight size={18} />
                <div>
                  <strong>Current surface</strong>
                  <span>{activeRole}</span>
                </div>
              </div>
            </div>

            <div className="profile-actions" style={{ marginTop: 24 }}>
              <button className="primary-button" onClick={login}>
                Name this passbook
              </button>
              <button className="secondary-button" onClick={logout}>
                <SignOut size={18} />
                Start fresh
              </button>
            </div>
          </section>

          <div className="poster-side">
            <section className="paper-sheet sheet-pad">
              <div className="eyebrow">Mode switch</div>
              <div className="offer-claim-title">One system, two role surfaces, one identity trail.</div>
              <p className="sheet-copy" style={{ marginTop: 12 }}>
                Consumer is where sharing and redeeming happen. Merchant mode is where visits become truth and reward lines settle into something a venue can trust.
              </p>
              <div className="profile-actions" style={{ marginTop: 22 }}>
                <Link href="/" className="secondary-button">
                  Consumer home
                </Link>
                <Link href="/merchant/today" className="primary-button">
                  Merchant today
                  <ArrowRight size={18} />
                </Link>
              </div>
            </section>

            <section className="ink-sheet sheet-pad profile-doctrine">
              <div className="eyebrow">Identity doctrine</div>
              <div className="metric-stack">
                <div className="metric-line">
                  <div className="metric-label">
                    <strong>Cheap first</strong>
                    <span>Do not spend on OTP, KYC, or app-store machinery before the loop earns the right to scale.</span>
                  </div>
                  <div className="metric-value">Lean</div>
                </div>
                <div className="metric-line">
                  <div className="metric-label">
                    <strong>Enough trust</strong>
                    <span>Session and device identity are enough for the first pilot because merchant confirmation closes the truth loop.</span>
                  </div>
                  <div className="metric-value">Pilot</div>
                </div>
                <div className="metric-line">
                  <div className="metric-label">
                    <strong>Upgrade later</strong>
                    <span>Add stronger identity only when revenue and abuse patterns prove the extra cost is justified.</span>
                  </div>
                  <div className="metric-value">Later</div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
