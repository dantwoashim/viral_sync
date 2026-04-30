# Day 77 Go / No-Go

## Simulation

Run a 20-user pilot simulation before onboarding the first real merchant shift:

- 5 referrers create invite links.
- 10 invited users claim from distinct devices.
- 5 users present redeem codes at the counter.
- Staff confirms the live challenge for each real visitor.
- Support searches one invite, one code, one receipt, and one merchant record.

## Decision

Current recommendation: go with watchlist.

## Watchlist

- Outbox retries must be visible during the live run.
- Reused demo devices can create false positive review signals.
- Receipt explorer should be used after each controlled confirmation.

## Blockers

No hard blocker remains for a controlled pilot. Do not expand beyond one location until live redemption notes are clean.
