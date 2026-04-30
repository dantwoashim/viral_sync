# Day 180 - Compression Cost Model

The documented tradeoff:

- PDA history is simpler to inspect but grows account footprint over time.
- Compressed history lowers long-term history footprint but adds root indexing and proof generation complexity.

Recommendation:

```text
Keep hot settlement state as PDAs; compress only settled historical receipt leaves.
```
