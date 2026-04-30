# Day 94 Action POST Endpoint

## Endpoint

`POST /api/actions/causal-receipt/:id`

## Input

```json
{
  "account": "SolanaWalletPublicKey"
}
```

## Output

The endpoint returns a signed receipt verification intent and a simulated transaction payload. It does not move funds or submit a mainnet transaction.

## Honesty Boundary

The transaction field is a base64 signed intent envelope until a real transaction builder and relayer are configured.
