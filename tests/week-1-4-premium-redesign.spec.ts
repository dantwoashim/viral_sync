import { existsSync, readFileSync } from "fs";
import path from "path";
import { expect } from "chai";

function readRepoFile(filePath: string) {
  return readFileSync(path.join(process.cwd(), filePath), "utf8");
}

describe("week 1-4 premium redesign artifacts", () => {
  it("defines a sharper product narrative and copy rules", () => {
    const narrative = readRepoFile("docs/premium-product-narrative.md");

    expect(narrative).to.include("Pay rewards only after verified visits");
    expect(narrative).to.include("Fund bounty -> Share invite -> Staff verifies visit");
    expect(narrative).to.include("Remove these phrases");
    expect(narrative).to.include("Capped devnet pilot");
  });

  it("documents a ruthless route inventory with primary demo routes", () => {
    const inventory = readRepoFile("docs/premium-ux-route-inventory.md");

    expect(inventory).to.include("/offer/[token]");
    expect(inventory).to.include("/merchant/scan");
    expect(inventory).to.include("/receipts/[id]");
    expect(inventory).to.include("Primary Demo Route Set");
    expect(inventory).to.include("Archive Route Set");
  });

  it("separates the app into audience-specific shells", () => {
    const ia = readRepoFile("docs/premium-information-architecture.md");

    expect(ia).to.include("Proof Demo Shell");
    expect(ia).to.include("Visitor Shell");
    expect(ia).to.include("Merchant Shell");
    expect(ia).to.include("Ops Shell");
    expect(ia).to.include("Developer Shell");
    expect(ia).to.include("Lab Shell");
  });

  it("anchors the redesign against premium benchmarks", () => {
    const board = readRepoFile("docs/premium-benchmark-board.md");

    expect(board).to.include("Linear");
    expect(board).to.include("Stripe");
    expect(board).to.include("Vercel");
    expect(board).to.include("Apple Wallet");
    expect(board).to.include("Airbnb");
    expect(board).to.include("Framer");
    expect(board).to.include("Notion");
    expect(board).to.include("What does Viral Sync do?");
  });

  it("links the week 1-4 premium redesign docs from the main doc index", () => {
    const docsIndex = readRepoFile("docs/README.md");
    const readme = readRepoFile("README.md");

    [
      "docs/premium-product-narrative.md",
      "docs/premium-ux-route-inventory.md",
      "docs/premium-information-architecture.md",
      "docs/premium-benchmark-board.md",
      "docs/week-1-4-premium-redesign-completion.md",
    ].forEach((filePath) => {
      expect(existsSync(path.join(process.cwd(), filePath)), filePath).to.equal(true);
    });
    expect(docsIndex).to.include("Premium product narrative");
    expect(readme).to.include("Pay for verified visits, not unverifiable clicks");
  });

  it("defines a strict execution contract and 52-week evidence gate", () => {
    const contract = readRepoFile("docs/premium-execution-contract.md");
    const yearPlan = readRepoFile("docs/premium-redesign-year-plan.md");
    const pkg = JSON.parse(readRepoFile("package.json")) as { scripts: Record<string, string> };

    expect(contract).to.include("A week is not complete only because a document exists");
    expect(contract).to.include("Starting week 5");
    expect(yearPlan).to.include("From week 5 onward");
    expect(yearPlan).to.include("Screenshot QA tooling");
    expect((yearPlan.match(/\|\s*\d+\s*\|/g) ?? [])).to.have.length(52);
    expect(pkg.scripts["premium:gate"]).to.equal("ts-node scripts/audit-premium-redesign.ts");
  });
});
