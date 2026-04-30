# Day 179 - Indexer Integration

Receipt explorer responses now include compressed proof metadata alongside the normal receipt path.

The indexer integration model stores:

- Receipt id.
- Receipt PDA.
- Compressed root.
- Leaf hash.
- Leaf index.
- Tree id.
- Proof fields.

The normal receipt record remains canonical.
