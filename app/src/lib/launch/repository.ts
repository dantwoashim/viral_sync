import type { LaunchLedger, MerchantRecord } from '@/lib/launch/types';

export function merchantScoped<T extends { merchantId?: string }>(
  rows: T[],
  merchantId: string,
) {
  return rows.filter((row) => row.merchantId === merchantId);
}

export function requireLedgerMerchant(ledger: LaunchLedger, merchantId: string): MerchantRecord {
  const merchant = ledger.merchants.find((item) => item.id === merchantId);
  if (!merchant) {
    throw new Error('Merchant scope was not found.');
  }
  return merchant;
}

export function rewardBalanceForMerchant(ledger: LaunchLedger, merchantId: string) {
  const entries = (ledger.rewardLedgerEntries ?? []).filter((entry) => entry.merchantId === merchantId);
  return entries.length > 0 ? entries[entries.length - 1].balanceAfter : 0;
}
