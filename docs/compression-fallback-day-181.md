# Day 181 - Compression Fallback

Fallback plan:

- Primary path remains normal Causal Receipt PDA plus receipt explorer.
- If tree write or proof verification fails, hide the compressed badge.
- Settlement status, graph rendering, and explorer verification continue from the normal receipt record.

This keeps the demo and product risk contained.
