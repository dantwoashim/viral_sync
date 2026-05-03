# Reproduce Frontier Proof

1. Fund the configured devnet wallet. The final proof command uses --airdrop-sol 0 so it does not depend on faucet availability.
2. Confirm the program ID in Anchor.toml, declare_id!, and the deploy keypair match.
3. Run:

```bash
npm ci
npm run frontier:offline-preflight
npm run frontier:mock-final
npm run frontier:final 2>&1 | tee dist/final-command-transcript.txt
```

The mock command only rehearses the artifact pipeline with fixtures. It is not submission evidence.
