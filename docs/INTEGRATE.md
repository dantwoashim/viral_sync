# Integrate POC-1

Use Viral Sync receipts as portable outcome proofs.

```ts
import {
  deriveReceiptPda,
  verifyFraudGauntlet,
  verifyPoc1ReceiptArtifact,
} from 'viral-sync-sdk';

const receipt = verifyPoc1ReceiptArtifact(poc1ReceiptJson);
if (!receipt.ok) throw new Error(receipt.failures.join(', '));

const gauntlet = verifyFraudGauntlet(fraudGauntletJson);
if (!gauntlet.ok) throw new Error(gauntlet.failures.join(', '));
```

Core derivations:

- `deriveMerchantConfigPda`
- `deriveGrowthCampaignPda`
- `deriveTerminalDevicePda`
- `deriveClaimPassPda`
- `deriveReceiptPda`
- `deriveNullifierPda`
- `deriveSettlementPda`

The SDK verifier checks portable artifacts. Full live account verification should fetch the receipt, campaign, terminal device, claim pass, nullifier, and settlement accounts from Solana and apply the same rules in `poc1/POC-1.md`.
