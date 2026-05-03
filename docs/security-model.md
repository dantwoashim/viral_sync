# Security Model

Viral Sync is a capped localnet/devnet pilot until external review is complete.

## Assets

- Merchant reward tokens held in the Reward Escrow PDA vault.
- Causal Receipt accounts and settlement records.
- Campaign nullifiers.
- Hosted relayer API keys and signing secrets.
- Merchant/staff confirmation flows in the launch app.

## Trust Boundaries

- The Anchor program enforces custody, receipt uniqueness, settlement, and close constraints.
- The hosted app improves UX but must not be trusted as the source of protocol truth.
- The relayer may sponsor allowed instructions only inside the Causal Commerce policy.
- Receipt verification must work from SDK/API outputs, not private dashboard state.

## Main Threats

- Duplicate claims with the same nullifier.
- Duplicate settlement of the same receipt.
- Escrow overdraw or settlement beyond funded rewards.
- Wrong merchant or wrong account injection into transaction builders.
- Relayer replay or unauthorized instruction sponsorship.
- Staff device abuse or confirmation of fake visits.
- Misleading judge/demo claims that imply audited mainnet safety.

## Controls Implemented

- Campaign-scoped nullifier PDA.
- Settlement PDA derived from receipt PDA.
- SPL reward vault owned by Reward Escrow PDA.
- Checked token transfers.
- Vault reclaim and token account close.
- Hosted relayer instruction allowlist.
- Localnet verifier independent from the runner.
- Final submission packet that fails if the vault close proof is missing.

## Not Yet Production-Safe

- No paid external audit.
- No production key ceremony for relayer secrets.
- No uncapped mainnet funding.
- Staff-device authorization still needs production hardening before real merchants rely on it.
