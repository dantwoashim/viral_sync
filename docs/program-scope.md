# Program Scope

The current public product is the POC-1 outcome settlement path. Experimental Token-2022 and reputation modules are excluded from the live demo and are not required for receipt settlement.

| Instruction or module | Status | Used in proof? | Reason |
|---|---|---:|---|
| `register_merchant` | Core | Yes | Creates merchant-owned POC-1 config. |
| `enroll_terminal_device` | Core | Yes | Binds a terminal authority to merchant config. |
| `create_growth_campaign` | Core | Yes | Defines funded outcome bounty terms. |
| `issue_claim_pass` | Core | Yes | Binds visitor, campaign, and lineage hash before receipt recording. |
| `fund_growth_bounty` | Core | Yes | Moves reward tokens into escrow. |
| `record_causal_receipt` | Core | Yes | Records the terminal + visitor counter-attested receipt and nullifier. |
| `settle_receipt_reward` | Core | Yes | Releases escrow only when receipt terms match campaign terms. |
| `close_growth_bounty` | Core | Partial | Reclaims unreserved bounty balance after settlement lifecycle. |
| Token-2022 transfer hook | Experimental | No | Future receipt-to-token lineage bridge. |
| Geo fencing | Experimental | No | Not part of POC-1 receipt settlement. |
| Bond/dispute modules | Experimental | No | Replaced by future challenge-window design. |
| Viral oracle/reputation modules | Experimental | No | Future orderbook ranking and risk scoring. |
| Session keys | Experimental | No | Future delegated terminal/router UX. |

If a proof artifact claims POC-1 verification, only the core rows above are in scope.
