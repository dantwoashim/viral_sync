# Known Limitations

- The current public proof is devnet POC-1, not uncapped mainnet settlement.
- Counter-attestation proves merchant, enrolled terminal, and visitor agreement; it does not make physical-world collusion impossible.
- POC-1 stores payout beneficiaries on the receipt. Child lineage receipts now require the child referrer payout beneficiary to match the parent receipt visitor beneficiary, but root/referrer payout protection still requires a production wallet flow that displays and signs the beneficiary manifest preimage before it should be pitched as fully preventing payout redirection.
- The hosted app currently replays the generated devnet proof packet. It can issue server-side demo/pilot pass packets with expiration, nonce, and one-time-use state, but it does not create a fresh on-chain claim pass and receipt for every public visitor yet.
- The local pass lifecycle store is in-memory. Production requires persistent storage for pass issuance, consumption, replay checks, and audit trails.
- The product loop has three distinct objects: demo replay pass, pilot server-issued pass, and on-chain claim pass. Only the final one is an Anchor account.
- Without POS, payment, or receipt integration, POC-1 cannot independently prove that a purchase happened; it proves the counter-attested conversion path and token settlement conditions.
- On-chain hashes protect integrity after commitment, but off-chain manifest preimage availability remains required for audits and wallet display.
- Payment-bound receipts, staking, challenge windows, cNFT receipts, compressed receipt graphs, x402 paid verification, and Squads upgrade authority are roadmap items.
- Experimental Token-2022, oracle, dispute, bond, and reputation modules are not part of the current public proof path.
- Reproduce the same deployed program ID only with the maintainer's local deploy keypair. The submitted proof artifacts are already generated and source-bound.
