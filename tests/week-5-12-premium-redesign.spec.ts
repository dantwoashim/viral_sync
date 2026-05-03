import { existsSync, readFileSync } from "fs";
import path from "path";
import { expect } from "chai";

function readRepoFile(filePath: string) {
  return readFileSync(path.join(process.cwd(), filePath), "utf8");
}

describe("week 5-12 premium redesign implementation", () => {
  it("defines premium tokens in code and CSS", () => {
    const tokens = readRepoFile("app/src/lib/premium/design-system.ts");
    const css = readRepoFile("app/src/app/globals.css");

    expect(tokens).to.include("premiumTokens");
    expect(tokens).to.include("#0b1714");
    expect(tokens).to.include("proofLifecycleSteps");
    expect(css).to.include("--premium-bg");
    expect(css).to.include("--premium-proof");
    expect(css).to.include("--premium-accent");
    expect(css).to.include(".premium-surface-proof");
    expect(css).to.include("width: calc(100vw - 28px)");
  });

  it("uses a premium UI font pair in the root layout", () => {
    const layout = readRepoFile("app/src/app/layout.tsx");

    expect(layout).to.include("Geist");
    expect(layout).to.include("Geist_Mono");
    expect(layout).not.to.include("Anek_Devanagari");
    expect(layout).not.to.include("IBM_Plex_Mono");
  });

  it("ships reusable premium primitives and a design-system route", () => {
    const components = readRepoFile("app/src/components/premium/PremiumUi.tsx");
    const designSystem = readRepoFile("app/src/app/design-system/page.tsx");

    [
      "PremiumShell",
      "PremiumButton",
      "PremiumSurface",
      "PremiumStatusBadge",
      "PremiumProofRow",
      "PremiumStepRail",
      "PremiumTransactionPanel",
    ].forEach((exportName) => expect(components).to.include(`function ${exportName}`));

    expect(existsSync(path.join(process.cwd(), "app/src/app/design-system/page.tsx"))).to.equal(true);
    expect(designSystem).to.include("Premium interface rules in code");
  });

  it("rebuilds the homepage as proof-first instead of passbook-first", () => {
    const home = readRepoFile("app/src/app/page.tsx");

    expect(home).to.include("Only pay referral rewards after real visits.");
    expect(home).to.include("PremiumTransactionPanel");
    expect(home).to.include("record_causal_receipt");
    expect(home).not.to.include("PassbookScreen");
  });

  it("adds a demo route with localnet proof wiring", () => {
    const demo = readRepoFile("app/src/app/demo/page.tsx");
    const proofReader = readRepoFile("app/src/lib/premium/localnet-proof.ts");

    expect(demo).to.include("Prove one visit reward end to end.");
    expect(demo).to.include("readLocalnetProofSummary");
    expect(demo).to.include("proofLifecycleSteps");
    expect(demo).to.include("View localnet evidence");
    expect(proofReader).to.include("localnet-causal-commerce.json");
    expect(proofReader).to.include("Awaiting localnet evidence");
    expect(proofReader).to.include("manifest.pdas?.causalReceipt");
    expect(proofReader).to.include("tokenBalances?.afterClose?.rewardVault");
  });

  it("rebuilds the invite route as task-first and mobile-safe", () => {
    const invite = readRepoFile("app/src/app/invite/page.tsx");
    const css = readRepoFile("app/src/app/globals.css");

    expect(invite).to.include("Visitors see the reward, then prove the visit.");
    expect(invite).to.include("Claim demo invite");
    expect(invite).to.include("PremiumProofRow");
    expect(invite).not.to.include("InviteScreen");
    expect(css).to.include("@media (max-width: 640px)");
    expect(css).to.include(".premium-proof-row code");
    expect(css).to.include("word-break: break-word");
  });

  it("documents the week 5-12 completion and links it from indexes", () => {
    const completion = readRepoFile("docs/week-5-12-premium-redesign-completion.md");
    const system = readRepoFile("docs/premium-design-system.md");
    const docsIndex = readRepoFile("docs/README.md");
    const readme = readRepoFile("README.md");

    expect(completion).to.include("Week 12: Visitor Invite Rebuild");
    expect(system).to.include("The old broad beige/brown passbook dominance is deprecated");
    expect(docsIndex).to.include("Week 5-12 premium redesign completion");
    expect(readme).to.include("Invite -> Claim -> Redeem Code -> Merchant Confirmation -> Receipt Proof -> Causal Graph");
  });
});
