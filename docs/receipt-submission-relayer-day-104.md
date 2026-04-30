# Day 104 Receipt Submission Integration

## Shipped

Merchant confirmation now queues both:

- `receipt.submit`
- `receipt.index`

This lets the receipt service use the relayer path where appropriate while keeping indexing separate.

## Honesty Boundary

The relayer currently simulates sponsored verification and marks local jobs. It does not submit live mainnet transactions.
