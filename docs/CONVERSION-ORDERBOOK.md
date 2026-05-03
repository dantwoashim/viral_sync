# Proof-of-Conversion Orderbook

The Conversion Orderbook is the marketplace-shaped layer above POC-1 receipts.

A campaign link is only considered proof-backed when it is tied to:

- funded reward escrow
- enrolled terminal signer
- visitor signer
- claim-pass account lineage
- Causal Receipt PDA
- nullifier PDA
- settlement record
- `intent_manifest_hash`
- verifier output
- Fraud Gauntlet artifact

## What is live in this submission

The orderbook contains one proof-backed demo campaign when the source proof is fresh:

- `thamel-brew-counter-attested-visits`

It may also contain vision-only lanes. These are clearly labeled and are not claimed as live proof.

## Why it matters

A normal ad marketplace asks merchants to trust platform attribution. Viral Sync lets a merchant escrow a bounty and release it only when a POC-1 conversion receipt verifies on Solana.

This turns referrals, creator links, event attendance, local commerce visits, and agent-routed demand into portable proof objects.
