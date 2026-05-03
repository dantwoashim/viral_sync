import { existsSync, readFileSync } from "fs";
import path from "path";
import { expect } from "chai";

function readRepoFile(filePath: string) {
  return readFileSync(path.join(process.cwd(), filePath), "utf8");
}

describe("year plan audit artifacts", () => {
  it("documents the requested winning-plan status honestly", () => {
    const audit = readRepoFile("docs/year-plan-audit.md");

    expect(audit).to.include("Months 1-2");
    expect(audit).to.include("Months 3-4");
    expect(audit).to.include("Months 5-6");
    expect(audit).to.include("Months 7-8");
    expect(audit).to.include("Months 9-10");
    expect(audit).to.include("Months 11-12");
    expect(audit).to.include("not 100% complete as an audited mainnet product");
  });

  it("adds the requested final documentation set", () => {
    [
      "docs/winning-demo.md",
      "docs/protocol-invariants.md",
      "docs/security-model.md",
      "docs/composability.md",
      "docs/year-plan-audit.md",
    ].forEach((filePath) => {
      expect(existsSync(path.join(process.cwd(), filePath)), filePath).to.equal(true);
    });
  });

  it("exposes SDK helpers named in the plan", () => {
    const sdk = readRepoFile("sdk/src/index.ts");

    expect(sdk).to.include("verifyReceipt");
    expect(sdk).to.include("fetchCausalGraph");
    expect(sdk).to.include("deriveGrowthCampaignPda");
    expect(sdk).to.include("deriveReceiptPda");
    expect(sdk).to.include("buildClaimAction");
  });

  it("ships a minimal composability example app", () => {
    expect(existsSync(path.join(process.cwd(), "examples/receipt-verifier/src/index.ts"))).to.equal(true);
    expect(readRepoFile("examples/receipt-verifier/README.md")).to.include("verify a Causal Receipt");
  });
});
