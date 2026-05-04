'use client';

import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { CheckCircle, ShieldCheck, XCircle } from '@phosphor-icons/react';
import type { NormalizedReceiptProof } from '@/lib/proof/types';
import { receiptBackRows, receiptRows } from '@/lib/proof/normalizeReceipt';

export default function SignatureReceipt({ proof, compact = false }: { proof: NormalizedReceiptProof; compact?: boolean }) {
  const [flipped, setFlipped] = useState(false);
  const [sealClicks, setSealClicks] = useState(0);
  const rows = useMemo(() => receiptRows(proof), [proof]);
  const backRows = useMemo(() => receiptBackRows(proof), [proof]);
  const replayMode = sealClicks >= 5;

  return (
    <button
      className={`signature-receipt ${compact ? 'is-compact' : ''} ${flipped ? 'is-flipped' : ''} ${replayMode ? 'is-replay' : ''}`}
      type="button"
      aria-label={flipped ? 'Show receipt front' : 'Show technical receipt proof'}
      onClick={() => setFlipped((value) => !value)}
    >
      <span className="signature-receipt-inner">
        <span className="signature-receipt-face signature-receipt-front">
          <span className="receipt-kicker"><ShieldCheck size={18} weight="bold" /> Verified visit</span>
          <strong>{proof.merchantName}</strong>
          <small>Receipt #001</small>
          <span className="receipt-rule" />
          {rows.map(([label, value], index) => (
            <span className="receipt-line" style={{ '--delay': `${index * 70}ms` } as CSSProperties} key={label}>
              <span>{label}</span>
              <b>{value}</b>
            </span>
          ))}
          <span className="receipt-bottom">
            <span>Settled on Solana</span>
            <span>{proof.cluster}</span>
          </span>
          <span
            className="receipt-seal"
            role="presentation"
            onClick={(event) => {
              event.stopPropagation();
              setSealClicks((value) => value + 1);
            }}
          >
            <CheckCircle size={42} weight="bold" />
            <span>Viral Sync Verified</span>
          </span>
          {replayMode ? (
            <span className="receipt-replay" aria-hidden="true">
              <XCircle size={16} weight="fill" /> Duplicate replay rejected
            </span>
          ) : null}
        </span>
        <span className="signature-receipt-face signature-receipt-back">
          <span className="receipt-kicker">Technical back side</span>
          <strong>POC-1 receipt</strong>
          <small>Click to return to the customer view.</small>
          <span className="receipt-rule" />
          {backRows.map(([label, value]) => (
            <span className="receipt-line technical" key={label}>
              <span>{label}</span>
              <b>{value}</b>
            </span>
          ))}
        </span>
      </span>
    </button>
  );
}
