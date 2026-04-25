# Demo Script: Viral Sync

## 30-second explanation

Viral Sync is a Solana devnet referral and loyalty protocol prototype for local merchants. It includes an Anchor program, Next.js app, relayer, Solana Actions API, client adapters, and tests. It is not audited or mainnet-ready.

## 2-minute walkthrough

1. Start with the README status warning.
2. Show the merchant/customer flow.
3. Open the Anchor program folder.
4. Show the relayer and Actions service folders.
5. Show `npm run verify` and protocol tests.

## 5-minute technical walkthrough

Explain how a merchant creates or funds reward rules, how a customer action becomes a transaction, how the relayer sponsors the transaction, and how the Anchor program enforces protocol state on devnet.

## What to show in an interview

- Workspace layout
- Anchor program
- Relayer service
- Protocol tests
- Devnet-only warning

## What not to overclaim

- Do not claim mainnet readiness.
- Do not claim a security audit.
- Do not imply real merchant/customer adoption unless it exists.
- Do not use investment or financial hype.

## Likely interviewer questions

### Why devnet only?

Because handling real funds requires audit, monitoring, key management, incident response, and stronger local-validator coverage.

### What is the relayer responsible for?

It sponsors constrained transactions for the intended workflow. It should not be treated as a custody service or unrestricted transaction relay.

### What would you improve next?

More local-validator tests, better monitoring, formal threat modeling, audit readiness, and clearer demo screenshots.

