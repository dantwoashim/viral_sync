# Winning Demo

The demo should be a two-minute proof, not a product tour.

## Script

1. Say: "Clicks lie. Visits do not."
2. Show the merchant funding a Growth Bounty.
3. Show the visitor claim path and campaign-scoped nullifier.
4. Show staff confirmation of the real-world visit.
5. Show the Causal Receipt account and transaction signature.
6. Show reward settlement from the SPL vault.
7. Show `close_growth_bounty` reclaiming unused funds and closing the vault account.
8. Show the replay attempt failing.
9. Show the SDK or example verifier reading the receipt without trusting the app UI.

## Required Evidence

- Localnet smoke manifest in `tmp/localnet-causal-commerce.json`.
- Verifier output in `tmp/localnet-causal-commerce-verifier.json`.
- Proof graph in `docs/localnet-proof-graph.md`.
- Evidence report in `docs/localnet-evidence-report.md`.
- Final packet in `docs/frontier-submission-packet.md`.

## Fallback

If devnet is flaky, run the localnet smoke path and show the generated packet:

```bash
npm run build:program
npm run localnet:smoke
npm run localnet:proof-graph
npm run localnet:evidence-report
npm run frontier:submission
```
