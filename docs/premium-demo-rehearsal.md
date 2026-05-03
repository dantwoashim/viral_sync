# Premium Demo Rehearsal

This is the final demo rehearsal contract for the premium product finish. The demo is not a tour of routes; it is a timed proof sequence.

## Target

- Target duration: 1:52.
- Primary route: `/demo`.
- Backup route: `/premium-scorecard`.
- Verification route: `/developer` and `/example-receipt-graph`.
- Proof rule: every claim shown in narration must map to a PDA, signature, vault state, replay rejection, SDK call, or generated artifact.

## Timed Spine

| Time | Move | Exact Point |
|---:|---|---|
| 00:00 | Claim | Merchants should pay for verified visits, not unverifiable clicks. |
| 00:18 | Bounty | Show funded bounty and invite share. |
| 00:42 | Visit | Claim, redeem, and confirm the in-store visit. |
| 01:14 | Receipt | Show receipt PDA, record transaction, settlement transaction, and reward vault. |
| 01:42 | Replay | Show duplicate claim/settlement rejection while the successful proof remains visible. |
| 01:52 | Verify | Open SDK/example verification route. |

## Rehearsal Pass Criteria

- The first screen communicates the product without setup context.
- The proof path stays under two minutes without skipping settlement or replay rejection.
- The fallback story is visible without apologizing for network conditions.
- The final screenshot packet includes `/demo`, `/premium-scorecard`, `/developer`, and `/example-receipt-graph`.
- The product never says it is a prototype, internal plan, or student-grade artifact on primary screens.
