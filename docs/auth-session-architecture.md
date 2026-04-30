# Auth and Session Architecture

Day 29/30 replaces "localStorage as authority" with a server-issued guest session baseline.

## Session Types

| Session | Purpose | Authority |
|---|---|---|
| Consumer guest | Mobile passbook, invite, claim, redeem code | Server-issued `vs_guest_session` httpOnly cookie |
| Merchant operator | Dashboard and scan terminal | Temporary staff PIN now; full RBAC pending |
| Staff device | Visit challenge and counter attestation | Planned enrolled device key rooted in merchant org |
| Admin/fraud reviewer | Fraud queue and manual holds | Planned server auth with audit log |

## Current Implementation

- `POST /api/launch/session` creates or resumes a guest session.
- The session id is set in an httpOnly `vs_guest_session` cookie.
- The client receives a display name and session id for UX/API compatibility, but the cookie is the source of truth.
- Existing launch APIs still accept explicit session ids during the transition; new session-aware endpoints should prefer the cookie.
- `POST /api/launch/merchant/login` creates a scoped merchant session with `owner`, `admin`, or `staff` role.
- `POST /api/launch/staff-device` enrolls or revokes demo staff terminals.
- Sensitive merchant actions emit audit events with request id, actor, target, action, and result.
- Reward settlement writes append-only ledger entries with idempotency keys.

## Threat Model Notes

- localStorage can be edited by the user, so it must not authorize rewards by itself.
- Same-device self-referral blocking is still a launch-level fraud guard, not a production identity proof.
- Merchant confirmation requires a temporary staff PIN and must graduate to enrolled staff devices.
- Causal Invite signatures and nullifiers must be server-verified before receipt submission.

## Next Hardening

1. Store sessions in Postgres instead of signed cookie-only state.
2. Add merchant org login and staff roles.
3. Enroll staff devices with public keys and rotation.
4. Move challenge signing to wallet or WebCrypto keys instead of demo HMAC signatures.
5. Add audit events for every auth failure.

## Day 30-40 Status

Implemented:

- Server-issued guest cookie.
- Merchant session model.
- Staff device enrollment/revocation model.
- Authorization helpers for consumer, merchant role, and staff device paths.
- Audit event model.
- Migration draft for normalized tables.
- Repository helpers for merchant scoping.
- Deterministic demo seed/reset scripts.
- Append-only reward ledger entries.
- Idempotency record model for retry-safe mutations.
