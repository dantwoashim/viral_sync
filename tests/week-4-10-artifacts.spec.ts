import { readFileSync } from "fs";
import path from "path";
import { expect } from "chai";

function readRepoFile(filePath: string) {
  return readFileSync(path.join(process.cwd(), filePath), "utf8");
}

describe("week 4-10 causal commerce artifacts", () => {
  it("exposes localnet golden-path and verifier package commands", () => {
    const pkg = JSON.parse(readRepoFile("package.json")) as { scripts: Record<string, string> };

    expect(pkg.scripts["localnet:causal-commerce"]).to.equal("ts-node scripts/run-causal-commerce-localnet.ts");
    expect(pkg.scripts["localnet:verify-receipt"]).to.equal("ts-node scripts/verify-causal-receipt-localnet.ts");
  });

  it("keeps the runner focused on the full Causal Receipt path", () => {
    const runner = readRepoFile("scripts/run-causal-commerce-localnet.ts");

    expect(runner).to.include("createGrowthCampaign");
    expect(runner).to.include("fundGrowthBounty");
    expect(runner).to.include("recordCausalReceipt");
    expect(runner).to.include("settleReceiptReward");
    expect(runner).to.include("duplicate campaign nullifier");
    expect(runner).to.include("duplicate receipt settlement");
  });

  it("keeps the independent verifier separate from the runner", () => {
    const verifier = readRepoFile("scripts/verify-causal-receipt-localnet.ts");

    expect(verifier).to.include("receipt status is");
    expect(verifier).to.include("settlement split does not add up");
    expect(verifier).to.include("nullifier first receipt");
    expect(verifier).to.include("escrow total_settled");
  });

  it("documents the state-only escrow limitation before judge use", () => {
    const completion = readRepoFile("docs/week-4-10-completion.md");
    const readme = readRepoFile("README.md");

    expect(completion).to.include("protocol escrow accounting, not SPL vault custody");
    expect(readme).to.include("escrow funding, receipt recording, settlement, replay rejection, and vault close behavior");
  });
});
