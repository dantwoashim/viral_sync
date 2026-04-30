# Day 176 - Compression Design

Compression scope is intentionally narrow:

```text
Historical receipt leaves only.
```

Hot state stays live:

- Active campaigns.
- Unsettled receipts.
- Merchant config.
- Reward escrow.
- Open disputes.

This avoids breaking fraud, payout, and dispute workflows while still preparing for high-volume receipt history.
