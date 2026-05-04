# Viral Sync

Viral Sync is the Solana settlement layer for outcome-based marketing: merchants escrow bounties, creators or agents route customers, and payouts only release when the customer actually converts.

Every payout is backed by a POC-1 receipt: a PDA-based Solana proof signed by the merchant, an enrolled terminal, and the visitor, with nullifier replay protection and settlement-time intent checks.

Each receipt commits to the invite hash, campaign nullifier, visit attestation hash, and intent manifest hash. The point is not to reward clicks. The point is to make offline referral spend verifiable.

The only way to create this receipt is for the merchant, enrolled terminal, and visitor to sign the same conversion.

```text
Pay for verified visits, not unverifiable clicks.
```

## What It Proves

The core path is deliberately narrow:

```text
merchant registers
terminal device is enrolled
campaign is created
claim pass is issued
bounty is funded
terminal + visitor counter-attested receipt is recorded
reward is settled from escrow
```

The public app is intentionally small: one landing page, one claim flow, one merchant terminal, one merchant today view, one receipt page, and one proof center.

The current public product is the POC-1 outcome settlement path. Experimental Token-2022 and reputation modules are excluded from the live demo and are not required for receipt settlement; see `docs/program-scope.md`.

## Devnet Proof

This submission includes a devnet proof path:

1. `register_merchant`
2. `enroll_terminal_device`
3. `create_growth_campaign`
4. `issue_claim_pass`
5. `fund_growth_bounty`
6. `record_causal_receipt`
7. `settle_receipt_reward`

The generated proof manifest lives at:

```text
app/public/proofs/devnet-causal-commerce.json
```

The final proof command uses a pre-funded devnet wallet and does not request faucet SOL:

```bash
npm run frontier:offline-preflight
npm run frontier:mock-final
# fund the configured devnet wallet
npm run frontier:final
```

`frontier:mock-final` only tests the artifact pipeline using fixtures. It is not submission evidence, and the real final assertion rejects mock artifacts.

The final command writes the judge-facing manifest to:

```text
app/public/proofs/devnet-causal-commerce.json
```

`tmp/devnet-causal-commerce-verifier.json` is the raw verifier output. `app/public/proofs/devnet-causal-commerce-verifier.json` is the published verifier copy with publication metadata.

The proof page is:

```text
/proof
```

It shows the five transaction steps, receipt PDA, nullifier PDA, reward escrow, visit attestation hash, intent manifest hash, and the valid-vs-malicious Causal Receipt Intent Validator results.

The fraud gauntlet is intentionally technical: 16 fraud attempts tested, 16 rejected, expected errors matched, and account mutation checks passed.

The Merchant Proof Passport packages the same verifier-backed facts into a portable merchant-owned proof object without customer personal data.

## Why Solana

Viral Sync needs cheap settlement, account-level proof objects, escrow custody, nullifier replay protection, and public receipt state. Solana is a good fit because the protocol can make reward movement fast, inspectable, and bounded by campaign state.

## Product Loop

```text
Campaign link -> Claim pass -> Merchant scan -> Co-signed receipt -> Escrow settlement -> Public proof
```

Useful routes:

```text
/                     Outcome settlement landing
/campaign/[slug]     Campaign offer
/claim/[token]       Customer claim flow
/merchant/scan       Terminal confirmation
/merchant/today      Merchant operations view
/receipt/[id]        Canonical receipt proof
/proof               Judge and developer proof center
```

## Repository Structure

```text
app/                  Next.js product app
programs/viral_sync/  Anchor program
relayer/              Sponsored transaction relayer
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
- Relayer authentication, payload caps, replay controls, and allowlists.
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
npm run devnet:causal-commerce:frontier-final
npm run devnet:verify-receipt -- --output tmp/devnet-causal-commerce-verifier.json
npm run frontier:verify-artifacts
npm run frontier:final
```

## Environment

App:

```text
NEXT_PUBLIC_SOLANA_RPC_URL
NEXT_PUBLIC_PROGRAM_ID
NEXT_PUBLIC_APP_URL
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

After any future protocol, verifier, schema, or proof-generator change, rerun `frontier:final` before submission or deployment.

The honest version: Viral Sync is not claiming production readiness. It is claiming a concrete, inspectable devnet path for merchant-funded causal receipts.
