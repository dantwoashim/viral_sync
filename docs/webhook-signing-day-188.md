# Day 188 - Webhook Signing

Webhook signing support:

```text
POST /api/launch/webhooks/sign
```

The endpoint returns:

- Raw payload string.
- Signature.
- Verification result.
- Header name: `X-Viral-Sync-Signature`.

Tampered payloads fail verification because the signature is bound to the exact JSON payload.
