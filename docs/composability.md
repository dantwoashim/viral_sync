# Composability

Viral Sync should be useful to another Solana builder without requiring them to adopt the whole app.

## SDK Surface

The TypeScript SDK exposes:

- `verifyReceipt(payload)`
- `fetchCausalGraph(baseUrl)`
- `deriveMerchantConfigPda(params)`
- `deriveGrowthCampaignPda(params)`
- `deriveRewardEscrowPda(params)`
- `deriveReceiptPda(params)`
- `deriveSettlementPda(params)`
- `buildClaimAction(baseUrl, token)`

## Example App

See `examples/receipt-verifier`.

The example fetches receipt verification JSON, checks it with the SDK, then reads the public causal graph.

## Integration Contract

A third-party app should be able to:

1. Derive expected PDAs from public hashes and addresses.
2. Fetch a receipt proof from the public API or directly from Solana RPC.
3. Verify that the receipt is settled.
4. Display graph edges without exposing raw PII.
5. Link to the hosted relayer only for allowed Causal Commerce actions.

## Why This Matters

The protocol is stronger when receipt proofs are portable. A merchant dashboard, creator tool, local discovery app, or analytics provider can all consume the same Causal Receipt primitive.
