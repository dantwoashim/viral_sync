import { existsSync, readFileSync } from "fs";
import path from "path";
import { expect } from "chai";

function readRepoFile(filePath: string) {
  return readFileSync(path.join(process.cwd(), filePath), "utf8");
}

const primaryUiFiles = [
  "app/src/app/page.tsx",
  "app/src/app/demo/page.tsx",
  "app/src/app/invite/page.tsx",
  "app/src/app/offer/[token]/page.tsx",
  "app/src/app/redeem/page.tsx",
  "app/src/app/merchant/scan/page.tsx",
  "app/src/app/receipts/[id]/page.tsx",
  "app/src/app/causal-graph/page.tsx",
  "app/src/app/merchant/today/page.tsx",
  "app/src/app/merchant/campaigns/page.tsx",
  "app/src/app/merchant/ledger/page.tsx",
  "app/src/app/admin/relayer/page.tsx",
  "app/src/app/developer/page.tsx",
  "app/src/app/example-receipt-graph/page.tsx",
];

describe("week 29-38 premium redesign implementation", () => {
  it("removes internal week and judge copy from primary product screens", () => {
    for (const file of primaryUiFiles) {
      const source = readRepoFile(file);
      expect(source, file).not.to.match(/\bWeek\s+\d+\b/i);
      expect(source, file).not.to.include("judge-visible");
      expect(source, file).not.to.include("Judge script");
      expect(source, file).not.to.match(/hackathon|student project|basic SaaS|good enough/i);
    }

    expect(readRepoFile("app/src/app/causal-graph/page.tsx")).to.include("Inspect why a reward settled.");
    expect(readRepoFile("scripts/audit-premium-copy.mjs")).to.include("bannedVisibleCopy");
  });

  it("standardizes conversion actions and async states", () => {
    const ui = readRepoFile("app/src/components/premium/PremiumUi.tsx");
    const offer = readRepoFile("app/src/app/offer/[token]/page.tsx");
    const redeem = readRepoFile("app/src/app/redeem/page.tsx");
    const scan = readRepoFile("app/src/app/merchant/scan/page.tsx");
    const campaigns = readRepoFile("app/src/app/merchant/campaigns/page.tsx");

    expect(ui).to.include("PremiumAsyncState");
    expect(ui).to.include("role={tone === 'error' ? 'alert' : 'status'}");
    expect(ui).to.include('aria-live="polite"');
    expect(offer).to.include("Claim this visit");
    expect(offer).to.include("PremiumAsyncState");
    expect(redeem).to.include("Generate code");
    expect(redeem).to.include("No code yet");
    expect(scan).to.include("Confirm visit");
    expect(scan).to.include("Merchant queue failed");
    expect(campaigns).to.include("Publish funded bounty");
    expect(campaigns).to.include("Funding policy");
  });

  it("adds accessibility, motion, tactile, and reduced-motion CSS", () => {
    const css = readRepoFile("app/src/app/globals.css");

    expect(css).to.include(":focus-visible");
    expect(css).to.include(".premium-button:active");
    expect(css).to.include(".premium-proof-row:hover");
    expect(css).to.include("premiumRise");
    expect(css).to.include("premiumPulse");
    expect(css).to.include("premiumShimmer");
    expect(css).to.include("prefers-reduced-motion: reduce");
    expect(css).to.include("transform");
    expect(css).to.include("opacity");
  });

  it("adds transaction pending UX and proof completion moments", () => {
    const ui = readRepoFile("app/src/components/premium/PremiumUi.tsx");
    const demo = readRepoFile("app/src/app/demo/page.tsx");

    expect(ui).to.include("PremiumTransactionStatus");
    expect(ui).to.include("PremiumCompletionMoment");
    expect(demo).to.include("Recording receipt");
    expect(demo).to.include("Settlement confirmed");
    expect(demo).to.include("Replay rejected");
    expect(demo).to.include("Reward settled once");
  });

  it("adds reusable screenshot QA and visual regression gates", () => {
    const pkg = readRepoFile("package.json");
    const screenshots = readRepoFile("scripts/capture-premium-screenshots.mjs");
    const visualGate = readRepoFile("scripts/audit-premium-visuals.mjs");

    expect(pkg).to.include("premium:screenshots");
    expect(pkg).to.include("premium:visual-gate");
    expect(pkg).to.include("premium:copy");
    expect(screenshots).to.include("/merchant/today");
    expect(screenshots).to.include("missingFocusStyles");
    expect(screenshots).to.include("overflow");
    expect(visualGate).to.include("appears blank or under-rendered");
    expect(visualGate).to.include("old consumer/passbook chrome");
  });

  it("documents week 29-38 completion and links the visual checklist", () => {
    const completion = readRepoFile("docs/week-29-38-premium-redesign-completion.md");
    const checklist = readRepoFile("docs/premium-visual-regression-checklist.md");
    const docsIndex = readRepoFile("docs/README.md");
    const readme = readRepoFile("README.md");
    const gate = readRepoFile("scripts/audit-premium-redesign.ts");

    expect(existsSync(path.join(process.cwd(), "docs/week-29-38-premium-redesign-completion.md"))).to.equal(true);
    expect(completion).to.include("Week 38: Visual Regression Checklist");
    expect(checklist).to.include("npm run premium:screenshots");
    expect(docsIndex).to.include("Week 29-38 premium redesign completion");
    expect(readme).to.include("Staff confirmation hardening with enrolled device proof");
    expect(gate).to.include("week-29-38-premium-redesign-completion.md");
  });
});
