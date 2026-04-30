# Day 137 Program Security Review

## Account Constraints

- Causal merchant config derives from authority and org hash.
- Growth campaign derives from merchant config and campaign hash.
- Receipt, nullifier, escrow, and settlement PDAs use distinct seeds.

## Signer Checks

- Merchant setup requires merchant authority.
- Settlement requires expected receipt/campaign context.
- Session authority derives from authority and delegated signer.

## Settlement Invariants

- Duplicate settlement slots are rejected.
- Pending state cannot clear until required slots settle.
- Impossible Token-2022 fee gross-up settings are rejected.
