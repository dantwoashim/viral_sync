# Day 263 - Queue And Outbox Reliability

Outbox reliability is tracked with pending, succeeded, failed, and dead-letter counts. The launch gate expects retry policy coverage and no failed or dead-letter jobs before expansion.

Acceptance notes:
- Pending backlog remains small.
- Failed and dead-letter jobs stay at zero.
- Retry policy is documented.
