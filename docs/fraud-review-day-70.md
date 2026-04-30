# Day 70 Fraud Review

## Scope

Day 70 replays the practical pilot attacks that can happen during a counter launch:

- same-device self-referral
- duplicate claim reuse
- expired visit challenge replay
- already-consumed challenge replay
- invalid merchant PIN or staff-device authorization
- repeated session or device bursts during a cafe rush

## Current Result

The launch ledger now exposes `getFraudReviewReport()` for a read-only sprint review. It summarizes blocked claims, consumed or expired challenge attempts, denied staff actions, repeated session or device patterns, tuned thresholds, and false-positive notes.

The customer-facing policy is intentionally conservative. Same-device self-referrals are blocked, challenge replay is blocked, and unauthorized staff actions are denied. Repeated device clusters are flagged for manual review instead of automatic account bans because real Kathmandu cafe groups can share phones.

## Tuned Thresholds

- Visit challenge TTL: 120 seconds.
- Suspicious blocked-claim rate: 20 percent.
- Campaign nullifier policy: one active claim per campaign nullifier.
- Same-device policy: block when the claimer device matches the referrer device.

## False Positives To Watch

- Friends or families sharing one phone.
- Staff typing a redeem code incorrectly.
- Campus groups redeeming together after class.
- Demo devices reused during judging.

## Follow-up

Move the review report into an internal admin dashboard once the pilot ledger is backed by production Postgres and role-based admin access is enforced.
