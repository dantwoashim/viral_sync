# Demo Hardening Runbook

## Day 21 Rehearsal Flow

1. Open `/`.
2. Create Alice's invite at `/invite`.
3. Open the offer link as Bob.
4. Claim the invite.
5. Generate Bob's redeem code at `/redeem`.
6. Open `/merchant/scan`.
7. Enter Bob's code and `DEMO-PIN`.
8. Confirm redemption.
9. Open `/receipts/<receiptId>` from the scan result or ledger.
10. Open `/causal-graph` and `/fraud-demo`.

## Evidence To Capture

- Receipt explorer page.
- Causal graph page.
- Fraud/replay demo page.
- Terminal showing `npm run verify`.

## Current Bug List

- Live hosted-app transaction submission is still represented by deterministic demo receipt references.
- Staff auth is a temporary PIN, not enrolled device keys.
- QR display remains a labeled demo visual.

## Day 27 Reliability Pass

Run the flow repeatedly with fresh sessions and record only blocking issues. Do not add unrelated features during this pass.

## Day 28 Freeze Checklist

- README reviewed.
- Demo script reviewed.
- `npm run verify` passed.
- Screenshots captured.
- Known limitations remain visible.
