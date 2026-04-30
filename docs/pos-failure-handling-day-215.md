# Day 215 - POS Failure Handling

Failure handling covers:

- POS outage: queue import and keep manual receipt evidence.
- Duplicate webhook: dedupe by receipt fingerprint.
- Bad data: reject row and keep redemption pending review.

This keeps the POS path robust without blocking the manual pilot flow.
