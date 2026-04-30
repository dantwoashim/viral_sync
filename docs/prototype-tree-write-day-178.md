# Day 178 - Prototype Tree Write

The compression prototype now writes a local/dev receipt leaf into a deterministic Merkle-style root.

- Source: settled Causal Receipts from the launch ledger.
- Leaf: no-PII compressed receipt payload.
- Output: root, leaf, leaf index, siblings, tree id, and canopy depth.

Surface: `/compression` and `/api/launch/compression/schema`.
