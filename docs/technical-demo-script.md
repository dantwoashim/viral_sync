# Technical Demo Script

Viral Sync is proof-of-outcome infrastructure for Solana commerce: merchants escrow rewards, enrolled terminals and visitors counter-attest conversions, and payouts settle only when the POC-1 receipt verifies.

1. Show the account model: merchant config, campaign, terminal device, claim-pass account, receipt, nullifier, settlement record, escrow.
2. Show the happy path instruction sequence.
3. Open `devnet-causal-commerce.json`.
4. Open `devnet-causal-commerce-verifier.json`.
5. Open `/proof` and explain the fraud-gauntlet tab/checks.
6. Open `/conversion-orderbook` and explain proof-backed campaign links.
7. Open `/receipt/latest` and `/merchant-passport`.
8. Explain what is on-chain and what is off-chain.
9. State limitations: no GPS/oracle claim; this is counter-attestation and settlement proof.
