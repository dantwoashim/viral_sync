# Viral Sync

Viral Sync is a Causal Commerce protocol for Solana. It lets a merchant fund a reward campaign and pay only when a staff-confirmed offline visit produces a causal receipt.

Each receipt commits to the invite hash, campaign nullifier, visit attestation hash, and intent manifest hash. The point is not to reward clicks. The point is to make offline referral spend verifiable.

```text
Pay for verified visits, not unverifiable clicks.
```

## What It Proves

The core path is deliberately narrow:

```text
merchant registers
campaign is created
bounty is funded
staff-confirmed receipt is recorded
reward is settled from escrow
```

The app still includes product surfaces for merchants, consumers, receipts, and operations, but the proof path is the part that matters most.

## Devnet Proof

This submission includes a devnet proof path:

1. `register_merchant`
2. `create_growth_campaign`
3. `fund_growth_bounty`
4. `record_causal_receipt`
5. `settle_receipt_reward`

The generated proof manifest lives at:

```text
app/public/proofs/devnet-causal-commerce.json
```

Run or regenerate the proof script with:

```bash
npm run devnet:causal-commerce
```

This writes the judge-facing manifest to:

```text
app/public/proofs/devnet-causal-commerce.json
```

Verify the receipt account against the manifest before generating the submission packet:

```bash
npm run devnet:verify-receipt -- --output tmp/devnet-causal-commerce-verifier.json
```

Generate the final judge packet only after the verifier output exists:

```bash
npm run frontier:submission
```

For a stricter final gate, run:

```bash
npm run frontier:verify
```

The proof page is:

```text
/frontier-proof
```

It shows the five transaction steps, receipt PDA, nullifier PDA, reward escrow, visit attestation hash, intent manifest hash, and the valid-vs-malicious Causal Receipt Intent Validator results.

## Why Solana

Viral Sync needs cheap settlement, account-level proof objects, escrow custody, nullifier replay protection, and public receipt state. Solana is a good fit because the protocol can make reward movement fast, inspectable, and bounded by campaign state.

## Product Loop

```text
Invite -> Claim -> Redeem Code -> Merchant Confirmation -> Receipt Proof -> Causal Graph
```

Useful routes:

```text
/frontier-proof     Devnet proof path
/invite             Referral invite flow
/offer/[token]      Offer claim flow
/redeem             Consumer redemption code
/merchant/scan      Staff counter confirmation
/receipts/[id]      Receipt explorer
/causal-graph       Attribution graph
/merchant/today     Merchant operations view
/security           Trust model
```

## Repository Structure

```text
app/                  Next.js product app
programs/viral_sync/  Anchor program
relayer/              Sponsored transaction relayer
server/actions/       Solana Actions service path
clients/              Client and POS adapter experiments
cranks/               Background cleanup runner
sdk/                  Verification and PDA helper package
tests/                Protocol and security regression tests
```

## Current Status

Viral Sync is a devnet and capped-pilot prototype. It is not an audited mainnet protocol for unrestricted real value.

Implemented hardening includes:

- Merchant authority gates for receipt recording and settlement.
- Beneficiary-bound reward destinations.
- Campaign time-window and reward-pool accounting checks.
- Nullifier replay protection.
- Intent manifest hash committed on receipt accounts.
- Staff confirmation hardening with enrolled device proof instead of plain bearer headers.
- Relayer authentication, payload caps, replay controls, and allowlists.
- Normalized production tables for the launch backend.
- Security regression tests for the highest-risk paths.

The localnet smoke path exercises the Causal Commerce loop with merchant registration, campaign creation, escrow funding, receipt recording, settlement, replay rejection, and vault close behavior.

The proof scripts document escrow funding, receipt recording, settlement, replay rejection, computed Causal Receipt Intent Validator checks, and optional close-check output before judge use.

## Current Limitations

- The public app includes a local commitment preview for merchant UX.
- The judge-facing proof page uses devnet transaction output from the proof manifest.
- The current Causal Receipt Intent Validator is Viral Sync-specific. It validates constrained receipt intent fields before settlement/sponsorship, but it is not yet a generic Solana transaction firewall and does not deeply inspect arbitrary serialized transaction effects.
- The program has not been externally audited.
- The current intent manifest is committed on-chain by hash; full manifest storage remains off-chain.
- Some advanced modules are intentionally disabled until their value-flow models are complete.

## Running Locally

Install dependencies:

```bash
npm ci
```

Start the app:

```bash
npm run dev --workspace app
```

Build the Anchor program:

```bash
anchor build
```

Run the full verification suite:

```bash
npm run verify
```

## Useful Commands

```bash
npm run typecheck
npm run verify
npm run production:readiness
npm run localnet:causal-commerce -- --replay-check --attack-check
npm run devnet:causal-commerce
npm run devnet:verify-receipt -- --output tmp/devnet-causal-commerce-verifier.json
npm run frontier:submission
npm run frontier:verify
```

## Environment

App:

```text
NEXT_PUBLIC_SOLANA_RPC_URL
NEXT_PUBLIC_PROGRAM_ID
NEXT_PUBLIC_MERCHANT_PUBKEY
NEXT_PUBLIC_RELAYER_URL
LAUNCH_DATABASE_URL
LAUNCH_CAUSAL_SECRET
LAUNCH_MERCHANT_ACCESS_TOKEN
LAUNCH_STAFF_PIN
LAUNCH_ALLOWED_ORIGINS
```

Relayer:

```text
RPC_URL
RELAYER_SECRET
RELAYER_API_KEY
CORS_ORIGINS
ALLOWED_PROGRAM_IDS
ALLOWED_INSTRUCTION_PREFIXES
ALLOWED_WRITABLE_ACCOUNTS
MAX_TRANSACTION_BYTES=2048
```

The honest version: Viral Sync is not claiming production readiness. It is claiming a concrete, inspectable devnet path for merchant-funded causal receipts.
