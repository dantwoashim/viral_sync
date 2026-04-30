# Day 146 High Severity Review Fixes

## Top Issues Tracked

- Arbitrary sponsored transaction: fixed with allowed instruction/program policy and signed intent simulation.
- Receipt replay: fixed with nonce idempotency storage.
- Uncapped beta spend: fixed with wallet, merchant, campaign, and daily caps.

## Regression

Protocol tests cover replay, spend limits, and sponsored intent policy.
