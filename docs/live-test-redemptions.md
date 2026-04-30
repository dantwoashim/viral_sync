# Day 79 Live Test Redemptions

## Controlled Test Plan

Run 5-10 redemptions with known testers before a public push.

| Test | Expected result | Evidence |
|---|---|---|
| Claim from fresh device | Claim accepted | Passbook row |
| Same-device self-referral | Claim blocked | Fraud review |
| Redeem code generated | Code visible with QR | Redeem screen |
| Staff confirms code | Receipt created | Receipt explorer |
| Search by code | Support result found | `/admin/support` |
| Search by receipt | Receipt result found | `/admin/support` |

## Timing Targets

- Claim to code: under 15 seconds.
- Staff scan to confirmation: under 30 seconds after customer is ready.
- Support lookup: under 10 seconds with a known code or receipt.

## Error Log

Record any camera miss, typo, expired challenge, duplicate tap, or confusing staff prompt here during the real run.
