# Golden Demo Path

This is the only path that should matter in a judge walkthrough. Supporting routes can exist, but the demo should not wander.

## Target Demo

```text
Merchant Register
  -> Create Growth Bounty
  -> Fund Escrow
  -> Create Causal Invite
  -> Claim With Nullifier
  -> Generate Visit Challenge
  -> Staff Device Confirms
  -> Record Causal Receipt
  -> Settle Reward
  -> Close Bounty And Reclaim Vault
  -> Verify Receipt
  -> Show Causal Graph
  -> Show Replay Rejection
```

## Current Frontier Path

```text
/invite
  -> /offer/[token]
  -> /redeem
  -> /merchant/scan
  -> /receipts/[id]
  -> /causal-graph
  -> /fraud-demo
```

The current product loop is useful for UX and story, but the winning build must wire the receipt and settlement steps to real localnet/devnet transactions.

## Demo Script

1. Open with the problem: referrals are easy to fake, verified visits are what merchants pay for.
2. Register a merchant and show the Causal Merchant PDA.
3. Create and fund a Growth Bounty and show the campaign/escrow PDAs.
4. Create a Causal Invite and show the signed invite payload.
5. Claim the invite as a second session and show the campaign nullifier.
6. Generate a redeem code and one-time visit challenge.
7. Confirm the code with an enrolled staff device.
8. Show the Causal Receipt transaction and receipt PDA.
9. Settle the reward and show balances/settlement record.
10. Close the bounty, reclaim unused reward tokens, and show the vault account closed.
11. Open the public receipt verifier and causal graph.
12. Replay the same claim/nullifier/challenge and show rejection.

## Hard Demo Requirements

- Every proof object has either a localnet account fetch or devnet explorer link.
- The receipt reference is never a `demo_tx_*` string in the final winning path.
- The graph derives from receipt state or indexed program events.
- The demo works from a fresh clone with documented commands.
- The backup video shows the same flow, not a different mocked path.

## Localnet Command Path

```bash
npm run build:program
npm run localnet:causal-commerce -- --replay-check --close-check
npm run localnet:verify-receipt -- --manifest tmp/localnet-causal-commerce.json
```

The runner covers merchant registration, Growth Bounty creation, SPL vault funding, Causal Receipt recording, replay rejection, settlement, vault reclaim, vault account close, and manifest generation. The verifier then checks receipt, campaign, escrow, nullifier, settlement, token balances, and closed-vault state independently.

## Non-Demo Surfaces

These are useful, but they should not appear before the proof loop:

- `/developer`
- `/performance`
- `/legal`
- `/polish`
- `/hardening`
- `/submission`
- Historical `docs/*day-*.md` notes
