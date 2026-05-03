# Winner Scope

Viral Sync should be judged as an open Solana protocol for proving offline commerce outcomes, starting with merchant-funded verified visits.

## Thesis

Clicks, impressions, and referral links are easy to fake. A merchant-confirmed visit is harder to fake and more valuable to local businesses. Viral Sync turns that event into a Causal Receipt: a Solana-verifiable record that connects a signed invite, a campaign nullifier, a dual-attested visit, and reward settlement.

The product wedge is local merchant growth. The protocol primitive is broader: reusable proof that an off-chain action happened because of an attributable on-chain or signed path.

## Golden Claim

Viral Sync lets merchants pay for verified visits instead of unverifiable referral clicks.

## What Must Be True In The Winning Build

- A merchant can register a Causal Commerce config on localnet/devnet.
- A merchant can create and fund a Growth Bounty.
- A customer can create a Causal Invite.
- A visitor can claim the invite with a campaign-scoped nullifier.
- A staff device can confirm a one-time visit challenge.
- The program can record a Causal Receipt account.
- The program can settle a reward exactly once from funded escrow.
- The receipt explorer can show the receipt account, settlement state, and explorer links.
- The SDK/API can verify the receipt without trusting the main app UI.

## In Scope

- Solana devnet and localnet.
- Anchor program accounts and instructions.
- SPL Token or Token-2022 reward escrow.
- Walletless UX through a constrained relayer.
- Public receipt verification.
- Causal graph reconstruction from receipt state and events.
- SDK helpers for PDA derivation and receipt verification.
- Explicit limitations before mainnet funds.

## Out Of Scope

- Mainnet funds before external audit.
- Broad POS integrations before one import/webhook path is proven.
- Claims of fraud-proof attribution.
- Paid infrastructure.
- Paid audits.
- Growth marketing.
- Unbounded merchant dashboards that distract from the proof loop.

## Judge-Facing Positioning

Use this sentence first:

```text
Viral Sync is the Causal Receipt protocol for Solana: merchants fund rewards, customers share signed invites, staff confirm real visits, and the resulting proof can be verified and composed by anyone.
```

Then show the live proof path before any dashboard, traction, or roadmap page.

