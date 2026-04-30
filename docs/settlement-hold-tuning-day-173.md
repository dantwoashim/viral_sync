# Day 173 - Settlement Hold Tuning

Settlement holds are tuned by quality score:

- Below 60: 72-hour hold and manual review.
- Below 75: 24-hour delayed payout and merchant notification.
- 75 or higher: normal settlement.

The policy is to hold rewards only when expected loss is higher than false-positive cost.
