# Premium Backup Package

The final demo cannot depend on one live network moment. This package defines the zero-budget fallback stack for a premium presentation.

## Primary Path

- `/demo` uses live proof data when the localnet manifest is available.
- `/developer` shows SDK verification.
- `/example-receipt-graph` proves another app can read the receipt graph.
- `npm run frontier:submission` validates the submission packet and go/no-go docs.

## Fallback Path

- Localnet manifest: `tmp/localnet-causal-commerce.json`.
- Proof graph: `docs/localnet-proof-graph.md`.
- Evidence report: `docs/localnet-evidence-report.md`.
- Scorecard: `docs/premium-final-scorecard.md`.
- Release packet: `docs/premium-release-candidate.md`.

## Recovery Script

```bash
npm run build:program
npm run localnet:smoke
npm run localnet:proof-graph
npm run localnet:evidence-report
npm run frontier:submission
```

## Judge-Room Rules

- If devnet is slow, do not wait silently; switch to the localnet manifest and keep the proof sequence identical.
- If the app reloads, reopen `/demo` first, then `/premium-scorecard` only as supporting evidence.
- If a proof object is challenged, open the receipt route or developer verifier rather than narrating around it.
- If a route has changed after release candidate, rerun `npm run premium:final` and regenerate the scorecard.
