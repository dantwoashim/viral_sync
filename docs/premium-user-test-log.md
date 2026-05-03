# Premium User Test Log

This zero-budget log captures the week 45-48 validation work that can be completed inside the repository: heuristic first-time-user review, merchant trust review, developer verification review, and mock judge rehearsal. Real external user sessions are still recommended before a public submission, but the interface now has concrete fixes and gates for the highest-risk issues.

## First-Time User Test

| Persona | 10-Second Question | Risk Found | Fix Applied |
|---|---|---|---|
| New visitor | What does the product do? | If the first screen drifts into protocol language, it sounds abstract. | Homepage and demo lead with verified-visit rewards. |
| Referred customer | What should I do next? | Invite, claim, and redeem could feel like separate products. | Core route CTAs were standardized around one primary action. |
| Staff member | What do I scan or type? | Camera permission failure could block the flow. | Manual code and staff-confirm state remain visible on scan route. |
| Skeptical reviewer | Why is this not click tracking? | Replay rejection was too easy to miss. | Demo now shows replay immediately after settlement. |
| Mobile user | Can I finish at 320px? | Narrow screens can hide CTAs or proof codes. | Final screenshot gate includes 320, 390, and 430 pixel widths. |

## Merchant Trust Test

| Merchant Objection | Damage | Fix Applied |
|---|---|---|
| I do not want uncapped rewards. | Funding feels financially unsafe. | Campaign and ledger surfaces show caps, funded vault state, and close/reclaim posture. |
| I need to know who gets paid. | Settlement feels opaque. | Receipt and ledger rows show referrer, visitor, status, signature, and amount. |
| What if someone replays the reward? | Fraud concern blocks trust. | Demo and relayer surfaces show duplicate nullifier/settlement rejection. |

## Developer Test

| Builder Task | Friction | Fix Applied |
|---|---|---|
| Verify a receipt without the app. | SDK story was easy to bury under product UI. | `/developer` and `/example-receipt-graph` are part of final screenshot coverage. |
| Find the proof graph. | Graph route needed a clear external-read story. | Causal graph copy now says the visit graph can be inspected. |

## Mock Judge Rehearsal

| Question | Expected Answer Surface |
|---|---|
| Why Solana? | Receipt PDA, escrow vault, replay/nullifier rejection, settlement transaction, SDK verification. |
| Why not just a database? | Fraud replay fails against protocol constraints and settlement is tied to funded custody. |
| What happens if the network is flaky? | Localnet manifest, evidence report, and premium scorecard preserve the proof path. |
| Is the UI premium enough? | Final screenshot gate, accessibility gate, performance gate, and copy gate create measurable polish evidence. |

## Personal External Validation Still Worth Doing

Run five real ten-minute calls before any final submission if possible. Ask each person to share their screen, open `/demo`, and explain the product in one sentence after ten seconds. Record only the confusion, not praise. Any repeated confusion should become a UI fix and rerun `npm run premium:final`.
