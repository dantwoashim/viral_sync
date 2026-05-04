# POC-1 Receipt Standard

POC-1 is Viral Sync's portable receipt format for outcome settlement on Solana.

Canonical one-liner:

Viral Sync is the Solana settlement layer for outcome-based marketing: merchants escrow bounties, creators or agents route customers, and payouts only release when the customer actually converts.

Technical definition:

Every payout is backed by a POC-1 receipt: a PDA-based Solana proof signed by the merchant, an enrolled terminal, and the visitor, with nullifier replay protection and settlement-time intent checks.

## Required Fields

```json
{
  "version": "POC-1",
  "network": "solana",
  "cluster": "devnet",
  "programId": "...",
  "campaign": "...",
  "merchant": "...",
  "terminalDevice": "...",
  "terminalAuthority": "...",
  "visitorAuthority": "...",
  "claimPass": "...",
  "receipt": "...",
  "nullifier": "...",
  "settlement": "...",
  "intentManifestHash": "...",
  "visitAttestationHash": "...",
  "lineageProofHash": "...",
  "rewardMint": "...",
  "rewardAmount": "1000",
  "proofLevel": "merchant_terminal_visitor_signed",
  "settlementVerified": true,
  "nullifierVerified": true
}
```

## Verification Rules

- The terminal device must be active and bound to the receipt merchant config.
- The terminal authority on the terminal device must match the receipt terminal authority.
- The claim-pass account must belong to the same campaign as the receipt.
- The claim-pass visitor authority must match the receipt visitor authority.
- The receipt intent manifest hash must be nonzero.
- The receipt reward amount, reward mint, and split terms must match campaign settlement terms.
- The settlement record must point to the receipt and campaign.
- The nullifier must exist for the campaign and point to the first receipt.
- Fraud-gauntlet evidence must reject all required cases without committed account mutation.

## Proof Levels

- `merchant_terminal_visitor_signed`: merchant authority, enrolled terminal, and visitor signed the outcome receipt.
- `payment_bound`: roadmap mode where a finalized payment reference is linked to the receipt.
- `payment_bound_terminal_visitor_signed`: roadmap mode combining payment proof and counter-attestation.
