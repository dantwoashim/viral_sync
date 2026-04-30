# Day 163 - Architecture Diagram

The architecture view connects the launch product to the protocol path:

- Product app -> Launch ledger API: invite, claim, redeem.
- Launch ledger API -> Anchor program: receipt accounts.
- Launch ledger API -> Relayer: sponsored verification intent.
- Anchor program -> Indexer: events.
- Indexer -> Causal graph: nodes and edges.
- Causal graph -> Product app: receipt explorer.

Rendered surface: `/architecture`.
