# Day 93 Action Metadata Endpoint

## Endpoint

`GET /api/actions/causal-receipt/:id`

## Returns

- title
- icon
- description
- label
- transaction action link
- web fallback link

## Behavior

If the receipt is missing, the endpoint returns a disabled metadata payload with an error. This is intentional for Blink preview safety.
