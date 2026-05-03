# POC-1: Proof-of-Conversion Attestation Format

POC-1 is the Viral Sync proof format for Solana commerce outcomes.

Viral Sync is proof-of-conversion infrastructure for Solana commerce: merchants escrow rewards, terminals and customers counter-attest conversions, and payouts settle only when the POC-1 receipt verifies.

A POC-1 conversion is valid when a merchant-funded campaign, enrolled terminal signer, visitor signer, claim-pass account lineage, nullifier PDA, causal receipt PDA, settlement record, and `intent_manifest_hash` all agree.

## Minimum fields

```json
{
  "merchant": "...",
  "campaign": "...",
  "terminalDevice": "...",
  "visitor": "...",
  "claimPass": "...",
  "receiptNullifier": "...",
  "intentManifestHash": "...",
  "lineageProofHash": "...",
  "settlement": "...",
  "proofLevel": "counter_attested",
  "attestationModel": "merchant_terminal_visitor_signed"
}
```

## What POC-1 verifies

- merchant reward escrow
- enrolled terminal signer
- visitor signer
- claim-pass account lineage
- nullifier replay rejection
- receipt PDA
- settlement record
- intent manifest hash
- proof generator/verifier hashes

Intent expiry is evaluated at receipt creation/effect-check time, not at judge review time.

## What POC-1 does not claim

POC-1 does not claim GPS proof or independent physical-world oracle proof. The current primitive is counter attestation: merchant authority + enrolled terminal + visitor signature + on-chain receipt/settlement.

## Orderbook extension

A conversion campaign may reference a POC-1 receipt object as its proof condition. This lets a public campaign link become a Solana-settled conversion bounty without trusting a black-box ad platform.
