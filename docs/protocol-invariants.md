# Protocol Invariants

These are the invariants the Frontier build must preserve.

## Account Identity

- Merchant config PDA is derived from merchant authority and org hash.
- Growth campaign PDA is derived from merchant config and campaign hash.
- Reward escrow PDA is derived from growth campaign and reward mint.
- Causal Receipt PDA is derived from growth campaign and receipt id hash.
- Nullifier PDA is derived from growth campaign and claimer nullifier hash.
- Settlement PDA is derived from the Causal Receipt PDA.

## Receipt Uniqueness

- A receipt id hash can create only one Causal Receipt for a campaign.
- A campaign nullifier can be consumed only once.
- Duplicate nullifier attempts must fail before a second receipt becomes valid.

## Escrow And Settlement

- `fund_growth_bounty` must move SPL tokens into the PDA-owned reward vault.
- Recording a receipt can only reserve reward if escrow has enough unreserved funds.
- Settlement cannot exceed the recorded receipt reward amount.
- Settlement can run only once per receipt.
- Referrer and visitor amounts must add exactly to the receipt reward amount.
- `close_growth_bounty` can run only when `total_reserved == 0`.
- Closing a bounty must reclaim unused funds and close the reward vault token account.

## Authority

- Only the merchant authority can fund and close a Growth Bounty.
- Token movement out of the reward vault must be signed by the Reward Escrow PDA.
- Wrong merchant, wrong vault, wrong mint, or wrong token account owner must fail constraints.

## Time And State

- Expired or closed campaigns must not accept new receipts.
- Paused merchant configs must not create new campaigns.
- Paused campaigns must not accept funding or new receipt recording.
- Closed campaigns must not be paused or resumed; they can only remain closed.
- Settled receipts must stay settled.
- Closed campaigns must not be fundable through the normal active-campaign path.

## Current Coverage

The localnet smoke covers the positive lifecycle, duplicate nullifier rejection, duplicate settlement rejection, SPL token settlement, and vault close. The TypeScript protocol suite now also captures production auth, pause, and circuit-breaker expectations. The next external-audit task is expanding validator-backed negative tests for every signer and account constraint listed above.
