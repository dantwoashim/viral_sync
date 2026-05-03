import { existsSync, readFileSync } from "fs";
import path from "path";
import { expect } from "chai";

function readRepoFile(filePath: string) {
  return readFileSync(path.join(process.cwd(), filePath), "utf8");
}

describe("week 21-28 premium redesign implementation", () => {
  it("adds dedicated merchant, ops, and developer workspace shells", () => {
    const shell = readRepoFile("app/src/components/premium/PremiumWorkspace.tsx");
    const appShell = readRepoFile("app/src/components/MerchantShell.tsx");

    expect(shell).to.include("Merchant console");
    expect(shell).to.include("Ops control");
    expect(shell).to.include("Developer surface");
    expect(shell).to.include("No consumer passbook chrome");
    expect(appShell).to.include("'/merchant/campaigns'");
    expect(appShell).to.include("'/merchant/ledger'");
    expect(appShell).to.include("'/admin/relayer'");
    expect(appShell).to.include("'/developer'");
    expect(appShell).to.include("'/example-receipt-graph'");
  });

  it("rebuilds merchant today around vault, visits, settlements, risk, and next action", () => {
    const today = readRepoFile("app/src/app/merchant/today/page.tsx");

    expect(today).to.include("Confirm visits, watch spend, settle only proof.");
    expect(today).to.include("getMerchantSummary");
    expect(today).to.include("getReceiptReconciliation");
    expect(today).to.include("Vault posture");
    expect(today).to.include("Risk and settlement");
    expect(today).not.to.include("MerchantDashboardScreen");
  });

  it("rebuilds merchant campaigns with funding, cap, close, and real publish path", () => {
    const campaigns = readRepoFile("app/src/app/merchant/campaigns/page.tsx");

    expect(campaigns).to.include("Launch a funded visit bounty with a visible cap.");
    expect(campaigns).to.include("/api/launch/campaigns");
    expect(campaigns).to.include("Publish funded bounty");
    expect(campaigns).to.include("Close and reclaim flow");
    expect(campaigns).not.to.include("SignalRibbon");
    expect(campaigns).not.to.include("ticket-sheet");
  });

  it("rebuilds the merchant ledger as a proof table with copy action", () => {
    const ledger = readRepoFile("app/src/app/merchant/ledger/page.tsx");
    const copy = readRepoFile("app/src/components/premium/CopyValueButton.tsx");

    expect(ledger).to.include("Audit every reward before fees.");
    expect(ledger).to.include("getReceiptReconciliation");
    expect(ledger).to.include("Copy signature");
    expect(ledger).to.include("premium-ledger-table");
    expect(copy).to.include("navigator.clipboard.writeText");
  });

  it("rebuilds relayer ops as sober policy, caps, replay, and error state UI", () => {
    const relayer = readRepoFile("app/src/app/admin/relayer/page.tsx");

    expect(relayer).to.include("Keep signed app intents capped, visible, and retryable.");
    expect(relayer).to.include("No passbook visual metaphor in ops.");
    expect(relayer).to.include("getRelayerMonitoring");
    expect(relayer).to.include("getRelayerPolicy");
    expect(relayer).to.include("runRelayerAttackSimulation");
    expect(relayer).to.include("Policy simulation required");
    expect(relayer).not.to.include("ticket-sheet");
  });

  it("rebuilds developer and example app surfaces around receipt verification", () => {
    const developer = readRepoFile("app/src/app/developer/page.tsx");
    const example = readRepoFile("app/src/app/example-receipt-graph/page.tsx");

    expect(developer).to.include("Verify visit receipts inside your own product.");
    expect(developer).to.include("Receipt verifier");
    expect(developer).to.include("verifyReceipt");
    expect(developer).to.include("fetchGraph");
    expect(developer).to.include("Copy code");
    expect(example).to.include("Ship a receipt verifier without our dashboard.");
    expect(example).to.include("getPublicReceiptVerification");
    expect(example).to.include("getCausalGraphData");
    expect(example).to.include("Open graph JSON");
  });

  it("documents and gates week 21-28 completion", () => {
    const completion = readRepoFile("docs/week-21-28-premium-redesign-completion.md");
    const docsIndex = readRepoFile("docs/README.md");
    const readme = readRepoFile("README.md");
    const gate = readRepoFile("scripts/audit-premium-redesign.ts");
    const css = readRepoFile("app/src/app/globals.css");

    expect(existsSync(path.join(process.cwd(), "docs/week-21-28-premium-redesign-completion.md"))).to.equal(true);
    expect(completion).to.include("Week 28: Example App Integration");
    expect(docsIndex).to.include("Week 21-28 premium redesign completion");
    expect(readme).to.include("/merchant/today");
    expect(gate).to.include("week-21-28-premium-redesign-completion.md");
    expect(css).to.include(".premium-workspace");
    expect(css).to.include(".premium-ledger-table");
  });
});
