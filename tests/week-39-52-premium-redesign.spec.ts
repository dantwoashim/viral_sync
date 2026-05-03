import { existsSync, readFileSync } from "fs";
import path from "path";
import { expect } from "chai";

function readRepoFile(filePath: string) {
  return readFileSync(path.join(process.cwd(), filePath), "utf8");
}

describe("week 39-52 premium redesign finalization", () => {
  it("adds final release scripts and package gates", () => {
    const pkg = JSON.parse(readRepoFile("package.json")) as { scripts: Record<string, string> };
    const screenshotScript = readRepoFile("scripts/capture-premium-screenshots.mjs");
    const visualGate = readRepoFile("scripts/audit-premium-visuals.mjs");
    const a11y = readRepoFile("scripts/audit-premium-accessibility.mjs");
    const performance = readRepoFile("scripts/audit-premium-performance.mjs");
    const release = readRepoFile("scripts/prepare-premium-release-candidate.mjs");
    const finalGate = readRepoFile("scripts/run-premium-final-gate.mjs");

    expect(pkg.scripts["premium:a11y"]).to.equal("node scripts/audit-premium-accessibility.mjs");
    expect(pkg.scripts["premium:performance"]).to.equal("node scripts/audit-premium-performance.mjs");
    expect(pkg.scripts["premium:release-candidate"]).to.equal("node scripts/prepare-premium-release-candidate.mjs");
    expect(pkg.scripts["premium:final"]).to.equal("node scripts/run-premium-final-gate.mjs");
    expect(screenshotScript).to.include("PREMIUM_VIEWPORT_SET");
    expect(screenshotScript).to.include("mobile-320");
    expect(screenshotScript).to.include("wide-1728");
    expect(screenshotScript).to.include("/premium-scorecard");
    expect(visualGate).to.include("--require-final-viewports");
    expect(a11y).to.include("prefers-reduced-motion: reduce");
    expect(performance).to.include("routeLoadMs");
    expect(release).to.include("premium-final-scorecard.md");
    expect(release).to.include("premium-release-candidate.md");
    expect(finalGate).to.include("Final screenshot capture");
    expect(finalGate).to.include("PREMIUM_VIEWPORT_SET");
    expect(finalGate).to.include("--require-final-viewports");
  });

  it("adds demo rehearsal UI and release scorecard surface", () => {
    const demo = readRepoFile("app/src/app/demo/page.tsx");
    const scorecard = readRepoFile("app/src/app/premium-scorecard/page.tsx");
    const shell = readRepoFile("app/src/components/MerchantShell.tsx");
    const css = readRepoFile("app/src/app/globals.css");

    expect(demo).to.include("Two-minute rehearsal");
    expect(demo).to.include("Backup path ready");
    expect(demo).to.include("premium:final");
    expect(scorecard).to.include("Release proof, not launch theater.");
    expect(scorecard).to.include("Release readiness");
    expect(scorecard).to.include("Final viewport widths");
    expect(shell).to.include("'/premium-scorecard'");
    expect(css).to.include(".premium-readiness-list");
    expect(css).to.include(".premium-final-rehearsal");
  });

  it("documents final rehearsal, backup, user-test, and release artifacts", () => {
    const completion = readRepoFile("docs/week-39-52-premium-redesign-completion.md");
    const rehearsal = readRepoFile("docs/premium-demo-rehearsal.md");
    const backup = readRepoFile("docs/premium-backup-package.md");
    const users = readRepoFile("docs/premium-user-test-log.md");
    const docsIndex = readRepoFile("docs/README.md");
    const readme = readRepoFile("README.md");
    const gate = readRepoFile("scripts/audit-premium-redesign.ts");

    expect(completion).to.include("Weeks 39-52 complete");
    expect(completion).to.include("PREMIUM_VIEWPORT_SET=final");
    expect(rehearsal).to.include("Target duration: 1:52");
    expect(backup).to.include("The final demo cannot depend on one live network moment");
    expect(users).to.include("zero-budget log");
    expect(docsIndex).to.include("Week 39-52 premium redesign completion");
    expect(docsIndex).to.include("Premium final scorecard");
    expect(readme).to.include("npm run verify");
    expect(gate).to.include("week-39-52-premium-redesign-completion.md");
  });

  it("requires generated final scorecard and release packet in the premium gate", () => {
    const gate = readRepoFile("scripts/audit-premium-redesign.ts");

    expect(gate).to.include("docs/premium-final-scorecard.md");
    expect(gate).to.include("docs/premium-release-candidate.md");
    expect(gate).to.include("Premium Final Scorecard");
    expect(gate).to.include("Premium Release Candidate");
    expect(existsSync(path.join(process.cwd(), "app/src/app/premium-scorecard/page.tsx"))).to.equal(true);
  });
});
