export function shortHash(value?: string | number | null, head = 6, tail = 5) {
  if (value === undefined || value === null || value === '') return 'missing';
  const text = String(value);
  if (text.length <= head + tail + 3) return text;
  return `${text.slice(0, head)}...${text.slice(-tail)}`;
}

export function signatureValue(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'signature' in value) {
    const signature = (value as { signature?: string | null }).signature;
    return signature || null;
  }
  return null;
}

export function explorerTx(signature?: string | null, cluster = 'devnet') {
  if (!signature) return null;
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}

export function explorerAddress(address?: string | number | null, cluster = 'devnet') {
  if (!address) return null;
  return `https://explorer.solana.com/address/${String(address)}?cluster=${cluster}`;
}
