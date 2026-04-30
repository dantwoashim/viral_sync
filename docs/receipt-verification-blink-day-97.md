# Day 97 Receipt Verification Blink

## Shipped

The receipt page can be shared or previewed as a Blink-compatible Action endpoint.

## Verification

`GET /api/actions/causal-receipt/:id` returns metadata.

`POST /api/actions/causal-receipt/:id` returns a signed verification intent for a wallet account.

## Fallback

The same receipt remains readable at `/receipts/:id`.
