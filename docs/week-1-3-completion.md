# Week 1-3 Completion

This records the first three weeks of the zero-budget winning plan as repository artifacts, not just planning notes.

## Week 1 - Winner Scope

Completed:

- Reduced the judging story to one claim: merchants pay for verified visits instead of unverifiable referral clicks.
- Defined the Causal Receipt as the core primitive: signed invite, campaign nullifier, staff-confirmed visit, and settlement proof.
- Separated winning-build requirements from non-goals such as unaudited mainnet funds, broad POS integrations, and inflated fraud-proof claims.
- Added the judge-facing opening sentence in [winner-scope.md](winner-scope.md).

Evidence:

- [winner-scope.md](winner-scope.md)
- Root README "Judge start here" section

## Week 2 - Golden Demo Path

Completed:

- Defined one canonical demo path from merchant registration through receipt verification and replay rejection.
- Marked the current product walkthrough as useful UX, but not enough to win until receipt and settlement steps use localnet/devnet transactions.
- Listed hard demo requirements so the final walkthrough cannot hide behind `demo_tx_*` references.
- Added a docs index that keeps judge-facing docs separate from historical daily notes.

Evidence:

- [golden-demo-path.md](golden-demo-path.md)
- [README.md](README.md)
- Root README "Core docs" and "Next winning build" sections

## Week 3 - First Localnet Protocol Step

Completed:

- Added a localnet CLI script for the first on-chain protocol step: `register_merchant`.
- The script derives the Causal Merchant PDA from `["causal_merchant", merchant_authority, org_id_hash]`.
- The script loads the built Anchor IDL, checks that the program is deployed on the selected RPC, funds a local wallet through airdrop when available, sends `register_merchant`, fetches the created account, and can require duplicate registration rejection with `--duplicate-check`.
- Added a package script so a fresh clone has a discoverable command.

Evidence:

- [../scripts/register-merchant-localnet.ts](../scripts/register-merchant-localnet.ts)
- `npm run localnet:register-merchant -- --help`
- `npm run localnet:register-merchant -- --duplicate-check`

Environment note:

The script is implemented and typechecked. Running the actual localnet transaction requires `solana-test-validator`/Solana CLI tooling and the Viral Sync program deployed to local validator RPC `http://127.0.0.1:8899`. That validator tooling is not available in the current Windows shell, so the transaction path is ready for the intended environment but was not executed here.

## Verification Run

Passed in this workspace after the week 1-3 changes:

```bash
npm run verify
npx tsc --noEmit --target ES2022 --lib ES2022 --module NodeNext --moduleResolution NodeNext --strict --esModuleInterop --skipLibCheck --resolveJsonModule scripts/register-merchant-localnet.ts
npm run localnet:register-merchant -- --help
```

