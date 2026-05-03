# Premium Product Narrative

Week 1 resets the product story. The current interface tries to be a passbook, a merchant OS, a protocol explorer, a hackathon proof packet, and an admin console at the same time. That is why first-time users do not immediately understand the product.

## One-Sentence Product Promise

Viral Sync lets merchants fund rewards that pay out only after a real visit is verified and recorded as a Solana Causal Receipt.

## Primary Audience

The primary product audience is the merchant operator who pays for growth and wants proof before rewards leave escrow.

Secondary audiences:

- referred visitors who need a fast claim and redemption path;
- staff who need a low-friction confirmation terminal;
- developers and judges who need to verify receipts independently.

## Main Conversion Moment

The interface must get a first-time user to believe this sequence in under ten seconds:

```text
Fund bounty -> Share invite -> Staff verifies visit -> Solana receipt settles reward -> Replay fails
```

Anything outside that sequence is supporting material.

## Required Above-The-Fold Message

Use this hierarchy on the first screen:

```text
Pay rewards only after verified visits.
Fund a bounty, confirm the visit, and settle rewards from a Solana-owned vault.
```

Primary CTA: `Run the proof`

Secondary CTA: `View receipt`

Trust line: `Localnet/devnet pilot. Uncapped mainnet funds are disabled until audit.`

## Copy Rules

Remove these phrases from primary UI:

- `Zero-budget pilot`
- `Loading reward configuration`
- `Loading venue`
- `Consumer Mode`
- `Day 101-107`
- `demo_tx_*`
- `modern passbook`

Replace with:

- `Capped devnet pilot`
- `Reward vault ready`
- `Thamel Brew House`
- `Visitor passbook`
- `Relayer safety`
- real transaction signatures or `Awaiting localnet run`
- `Verified visit rewards`

## Product Truths To Lead With

- Merchant funds are held in a PDA-owned reward vault.
- A campaign nullifier blocks duplicate claims.
- Settlement is exact-once.
- The unused bounty can be reclaimed when no rewards are reserved.
- The receipt can be verified outside the app UI.

## Product Truths To Keep Out Of Marketing Copy

- It is not audited for mainnet funds.
- It is not fraud-proof.
- It is not a full POS replacement.
- It is not a broad consumer wallet.
- It is not a production analytics warehouse.

## Emotional Target

The product should feel like Stripe Terminal meets Apple Wallet for local commerce proof: sober, crisp, tactile, and trustworthy. The pass metaphor should feel like a premium proof object, not a decorative theme.
