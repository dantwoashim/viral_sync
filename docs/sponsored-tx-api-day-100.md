# Day 100 Sponsored Transaction API

## Endpoint

`POST /api/launch/relayer/sponsor`

## Auth

Header:

```text
x-viral-sync-relayer-key: <service key>
```

## Body

```json
{
  "account": "SolanaWalletPublicKey",
  "intent": "signed intent JSON",
  "signature": "intent signature"
}
```

## Behavior

The API validates service auth, verifies the signed intent, checks the relayer policy, and returns a simulation result. It does not submit live transactions until the real relayer key management and transaction builder are enabled.
