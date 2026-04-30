# Day 80 Pilot Blockers

## Top Issues Fixed

1. Campaign builder now publishes title, reward, referral goal, redemption window, and active status to the pilot ledger.
2. Support can search by code, invite, receipt, claim, or merchant through `/admin/support` and `/api/launch/support/search`.
3. Staff has a training lane and launch kit so the first merchant does not rely on a verbal handoff.

## Regression Coverage

Protocol tests now include pilot support search, campaign publish validation, fraud threshold review, and 20-user simulation checks.

## Remaining Watchlist

- Real camera scanning still needs device testing across Android browsers.
- Admin support is read-only and should remain internal until full admin auth exists.
- The first public pilot should stay at one merchant and one location.
