# Day 268 - Event Pipeline Cleanup

The event pipeline cleanup compares source ledger events, outbox events, and dashboard views. Counts should reconcile in order so dashboards never claim more activity than the source system recorded.

Acceptance notes:
- Source events are authoritative.
- Outbox events cannot exceed source events.
- Dashboard views cannot exceed processed events.
