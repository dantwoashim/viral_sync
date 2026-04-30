# Day 92 Action Use Case

## Decision

Use case selected: verify Causal Receipt.

## Why

Receipt verification is safer than wallet-based claiming at this stage. It lets judges, merchants, and partners preview proof without changing customer reward state or requiring sponsored claim transactions.

## User Paths

- Wallet user: open the Blink and request a signed verification intent.
- Walletless user: open the normal web receipt page.

## Not Chosen Yet

Claiming a Causal Invite through Actions remains deferred until the relayer and abuse policy are hardened.
