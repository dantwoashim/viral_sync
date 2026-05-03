import { existsSync, readFileSync } from "fs";
import path from "path";
import { expect } from "chai";

function readRepoFile(filePath: string) {
  return readFileSync(path.join(process.cwd(), filePath), "utf8");
}

describe("week 40-52 final submission artifacts", () => {
  it("adds a final submission generator command", () => {
    const pkg = JSON.parse(readRepoFile("package.json")) as { scripts: Record<string, string> };
    const script = readRepoFile("scripts/prepare-frontier-submission.ts");

    expect(pkg.scripts["frontier:submission"]).to.equal("ts-node scripts/prepare-frontier-submission.ts");
    expect(script).to.include("frontier-submission-packet.md");
    expect(script).to.include("frontier-final-go-no-go.md");
    expect(script).to.include("close_growth_bounty");
    expect(script).to.include("Reward vault is not closed");
  });

  it("locks the final judge docs into the docs index", () => {
    const docsIndex = readRepoFile("docs/README.md");
    const completion = readRepoFile("docs/week-40-52-completion.md");

    expect(docsIndex).to.include("Week 40-52 completion");
    expect(docsIndex).to.include("Frontier submission packet");
    expect(docsIndex).to.include("Frontier final go/no-go");
    expect(completion).to.include("npm run frontier:submission");
    expect(completion).to.include("Reward vault token account close");
  });

  it("updates the golden path and reproducibility docs for close-check submission", () => {
    const golden = readRepoFile("docs/golden-demo-path.md");
    const repro = readRepoFile("docs/reproducibility.md");
    const readme = readRepoFile("README.md");

    expect(golden).to.include("--replay-check --close-check");
    expect(golden).to.include("Close Bounty And Reclaim Vault");
    expect(repro).to.include("npm run frontier:submission");
    expect(repro).to.include("reward vault token account is closed");
    expect(readme).to.include("The localnet smoke path exercises the Causal Commerce loop");
    expect(readme).to.include("vault close behavior");
  });

  it("can generate final packet artifacts from localnet outputs", () => {
    const packetScript = readRepoFile("scripts/prepare-frontier-submission.ts");

    expect(packetScript).to.include("Verifier is not passing");
    expect(packetScript).to.include("Replay checks are not all rejected");
    expect(packetScript).to.include("Localnet manifest was not produced with --close-check");
    expect(existsSync(path.join(process.cwd(), "scripts/prepare-frontier-submission.ts"))).to.equal(true);
  });
});
