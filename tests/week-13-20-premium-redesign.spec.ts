import { existsSync, readFileSync } from "fs";
import path from "path";
import { expect } from "chai";

function readRepoFile(filePath: string) {
  return readFileSync(path.join(process.cwd(), filePath), "utf8");
}

describe("week 13-20 premium redesign implementation", () => {
  it("rebuilds offer claim without losing real claim behavior", () => {
    const offer = readRepoFile("app/src/app/offer/[token]/page.tsx");

    expect(offer).to.include("Claim once. Redeem after the visit.");
    expect(offer).to.include("fetchReferralDetail");
    expect(offer).to.include("recordReferralOpen");
    expect(offer).to.include("claimReferralLink");
    expect(offer).to.include("Claim this visit");
    expect(offer).not.to.include("SignalRibbon");
    expect(offer).not.to.include("ticket-sheet");
  });

  it("rebuilds redeem as a counter handoff with live code generation", () => {
    const redeem = readRepoFile("app/src/app/redeem/page.tsx");

    expect(redeem).to.include("Create the code staff needs right now.");
    expect(redeem).to.include("fetchConsumerSummary");
    expect(redeem).to.include("createRedeemCode");
    expect(redeem).to.include("QrPayload");
    expect(redeem).not.to.include("RedeemScreen");
  });

  it("rebuilds staff scan with manual fallback and receipt proof link", () => {
    const scan = readRepoFile("app/src/app/merchant/scan/page.tsx");

    expect(scan).to.include("Enter the visitor code and confirm the visit.");
    expect(scan).to.include("confirmMerchantCode");
    expect(scan).to.include("Manual confirmation");
    expect(scan).to.include("Open receipt proof");
    expect(scan).not.to.include("StaffTerminalScreen");
  });

  it("rebuilds receipt proof and causal graph as premium proof surfaces", () => {
    const receipt = readRepoFile("app/src/app/receipts/[id]/page.tsx");
    const graph = readRepoFile("app/src/app/causal-graph/page.tsx");

    expect(receipt).to.include("Verify the visit receipt.");
    expect(receipt).to.include("getReceiptExplorer");
    expect(receipt).to.include("Receipt PDA");
    expect(receipt).to.include("compressedProof");
    expect(receipt).to.include("Local launch ledger reference");
    expect(graph).to.include("Inspect why a reward settled.");
    expect(graph).to.include("getCausalGraphData");
    expect(graph).to.include("getMultiHopDemo");
    expect(graph).to.include("premium-graph-edge");
  });

  it("adds inline replay proof to the demo route", () => {
    const demo = readRepoFile("app/src/app/demo/page.tsx");

    expect(demo).to.include("Replay proof");
    expect(demo).to.include("Success is followed by the fraud attempt.");
    expect(demo).to.include("premium-replay-strip");
  });

  it("hardens immersive routing and responsive CSS for week 13-20 routes", () => {
    const shell = readRepoFile("app/src/components/MerchantShell.tsx");
    const css = readRepoFile("app/src/app/globals.css");

    expect(shell).to.include("immersivePrefixes");
    expect(shell).to.include("'/offer/'");
    expect(shell).to.include("'/receipts/'");
    expect(shell).to.include("'/causal-graph'");
    expect(css).to.include(".premium-flow-grid");
    expect(css).to.include(".premium-code-display");
    expect(css).to.include(".premium-graph-edge");
    expect(css).to.include(".premium-replay-strip");
    expect(css).to.include(".premium-button:disabled");
  });

  it("documents week 13-20 completion and links it from indexes", () => {
    const completion = readRepoFile("docs/week-13-20-premium-redesign-completion.md");
    const docsIndex = readRepoFile("docs/README.md");
    const readme = readRepoFile("README.md");

    expect(existsSync(path.join(process.cwd(), "docs/week-13-20-premium-redesign-completion.md"))).to.equal(true);
    expect(completion).to.include("Week 20: Desktop QA Hardening");
    expect(docsIndex).to.include("Week 13-20 premium redesign completion");
    expect(readme).to.include("/receipts/[id]");
  });
});
