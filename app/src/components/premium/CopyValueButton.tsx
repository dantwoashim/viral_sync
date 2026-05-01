'use client';

import { useState } from 'react';

export function CopyValueButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button className="premium-table-action" type="button" onClick={copyValue}>
      {copied ? 'Copied' : label}
    </button>
  );
}
