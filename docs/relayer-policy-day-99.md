# Day 99 Relayer Policy

## Allowed

- Program: Viral Sync program id.
- Instruction: `verify_causal_receipt`.
- Accounts: causal receipt, growth campaign, merchant config, system program.

## Caps

- Daily sponsored transaction cap: 250.
- Per-wallet daily cap: 5.

## Required

- Service API key.
- Signed user intent.
- Simulation before sponsorship.

## Endpoint

`GET /api/launch/relayer/policy`
