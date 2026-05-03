# Viral Sync Docs

Judge-facing documents:

- [Frontier submission packet](frontier-submission-packet.md)
- [Frontier final go/no-go](frontier-final-go-no-go.md)
- [Auditor start here](auditor-start-here.md)
- [Protocol invariants](protocol-invariants.md)
- [Security model](security-model.md)
- [Production readiness](production-readiness.md)
- [Composability](composability.md)

Main proof artifact:

- `app/public/proofs/devnet-causal-commerce.json`

Verifier artifact:

- `tmp/devnet-causal-commerce-verifier.json`

Lead with the devnet receipt proof: funded SPL custody, Causal Receipt, exact-once settlement, nullifier replay rejection, and on-chain `intent_manifest_hash` commitment.
