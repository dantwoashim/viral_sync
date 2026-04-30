# Day 187 - Developer Docs

Developer summary:

- Install: `npm install viral-sync-sdk`.
- Verify: call `/api/launch/receipts/verify/{id}` and pass the response to `verifyReceipt`.
- Graph: call `/api/launch/causal-graph`.
- Webhooks: verify `X-Viral-Sync-Signature` against the raw JSON payload.
- Example: `/example-receipt-graph`.
