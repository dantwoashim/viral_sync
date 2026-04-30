# Day 8 - Design PDA seeds and account layouts

Repository-side completion note for the implementation plan audit.

Daily goal: Design PDA seeds and account layouts.

Shipped/covered: Define MerchantConfig, GrowthCampaign, RewardEscrow, CausalReceipt, NullifierRecord.

Quality bar: Check Rust/TS seed parity.

Evidence of progress: No seed drift at design level.

Guardrail: Do not add unrelated features. Do not weaken auth, ledger integrity, or protocol honesty to make the demo look better.

Status: Covered by the implemented launch app, protocol, documentation, and verification history recorded in docs/current-state.md. Real-world artifacts such as videos, merchant approvals, and live pilot results still require human follow-through where applicable.
