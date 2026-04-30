# Day 106 Program Event Indexer

## Shipped

`POST /api/launch/indexer/run` processes receipt submission and index jobs from the outbox.

## Auth

Header:

```text
x-viral-sync-indexer-key: <service key>
```

## Output

Returns mapped receipt ids, transaction references, and outbox status.
