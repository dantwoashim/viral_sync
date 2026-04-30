# Day 185 - Verification API

Public verification endpoint:

```text
GET /api/launch/receipts/verify/{id}
```

Responses include:

- Verification status.
- Receipt PDA.
- Transaction signature.
- Settlement status.
- Merchant label.
- Compressed proof metadata when available.

Missing receipts return `not_found`. Existing but unsettled receipts return `pending`.
