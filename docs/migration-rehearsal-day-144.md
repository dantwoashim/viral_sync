# Day 144 Migration Rehearsal

## Steps

1. Snapshot staging ledger.
2. Run migration against staging copy.
3. Verify receipt counts.
4. Roll back using down migration.
5. Rerun verify.

## Checks

- merchant count unchanged
- receipt ids unchanged
- outbox jobs preserved
- support search returns known code
