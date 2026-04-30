# Pilot Playbook

## Goal

Run one merchant, one location, one bounded campaign, and enough controlled redemptions to prove the Causal Receipt loop works at the counter.

## Day 71-80 Operating Flow

1. Onboard the organization, merchant, location, staff device, and first campaign at `/merchant/onboarding`.
2. Publish the campaign from `/merchant/campaigns`.
3. Train cashiers in `/merchant/training` before customer traffic begins.
4. Put the launch kit copy and QR materials from `/merchant/launch-kit` at the counter.
5. Use `/admin/support` to search by invite token, redeem code, receipt, claim, or merchant when something goes wrong.
6. Run a 20-user simulation and mark blockers in `docs/pilot-go-no-go.md`.
7. Run 5-10 controlled live redemptions and record timing/errors in `docs/live-test-redemptions.md`.
8. Fix the top three blockers and rerun `npm run verify`.

## Roles

- Owner: approves the campaign and counter copy.
- Staff: scans or types redeem codes and confirms only live customers.
- Pilot operator: monitors support search, fraud review, receipts, and outbox jobs.
- Customer: shares an invite, claims, and presents the QR or code at the counter.

## Exit Criteria

- Staff can explain the flow in one sentence.
- At least five controlled redemptions settle with receipts.
- Support can find any incident from a code, invite, receipt, claim, or merchant lookup.
- Known blockers are documented with owner and status.
