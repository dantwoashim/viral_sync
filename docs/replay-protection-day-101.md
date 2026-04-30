# Day 101 Replay Protection

## Shipped

Sponsored verification now stores a nonce in the launch ledger idempotency table under `sponsored:<wallet>`.

## Behavior

- First valid sponsored verification records the nonce.
- Reusing the nonce returns a replay error.
- Replay attempts are written to audit events.

## Endpoint

`POST /api/launch/relayer/sponsor`
