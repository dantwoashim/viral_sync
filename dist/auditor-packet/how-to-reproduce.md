# Reproduce Frontier Proof

1. Fund the configured devnet wallet. The final proof command uses --airdrop-sol 0 so it does not depend on faucet availability.
2. Confirm the program ID in Anchor.toml, declare_id!, and the deploy keypair match.
3. Run:

```bash
npm ci
npm run frontier:offline-preflight
npm run frontier:mock-final
npm run frontier:final-core:transcript
npm run auditor:packet
npm run frontier:assert-final
```

Regenerating the same program ID requires the maintainer deploy keypair at target/deploy/viral_sync-keypair.json. Without that private key, use:

```bash
npm ci
npm run frontier:verify-submitted-artifacts
```

The mock command only rehearses the artifact pipeline with fixtures. It is not submission evidence.
