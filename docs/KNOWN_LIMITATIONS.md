# Known Limitations

- The current public proof is devnet POC-1, not uncapped mainnet settlement.
- Counter-attestation proves merchant, enrolled terminal, and visitor agreement; it does not make physical-world collusion impossible.
- POC-1 stores payout beneficiaries on the receipt. Production creator/referrer protection still needs beneficiary preimage display/signing in the visitor intent flow or an on-chain claim-pass binding before it should be pitched as fully preventing payout redirection.
- The hosted app currently replays the generated devnet proof packet. It does not create a fresh on-chain claim pass and receipt for every public visitor yet.
- Payment-bound receipts, staking, challenge windows, cNFT receipts, compressed receipt graphs, x402 paid verification, and Squads upgrade authority are roadmap items.
- Experimental Token-2022, oracle, dispute, bond, and reputation modules are not part of the current public proof path.
- Reproduce the same deployed program ID only with the maintainer's local deploy keypair. The submitted proof artifacts are already generated and source-bound.
