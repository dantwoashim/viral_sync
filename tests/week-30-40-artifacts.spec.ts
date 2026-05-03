import { existsSync, readFileSync } from "fs";
import path from "path";
import { expect } from "chai";

function readRepoFile(filePath: string) {
  return readFileSync(path.join(process.cwd(), filePath), "utf8");
}

describe("week 30-40 close and hosted relayer artifacts", () => {
  it("adds an on-chain close instruction that reclaims tokens and closes the vault", () => {
    const lib = readRepoFile("programs/viral_sync/src/lib.rs");
    const source = readRepoFile("programs/viral_sync/src/instructions/causal_commerce.rs");

    expect(lib).to.include("close_growth_bounty");
    expect(source).to.include("pub struct CloseGrowthBounty");
    expect(source).to.include("close_account");
    expect(source).to.include("reclaimed_amount");
    expect(source).to.include("GrowthCampaignStatus::Closed");
  });

  it("makes localnet smoke prove the close path", () => {
    const runner = readRepoFile("scripts/run-causal-commerce-localnet.ts");
    const smoke = readRepoFile("scripts/smoke-localnet-causal-commerce.ts");
    const verifier = readRepoFile("scripts/verify-causal-receipt-localnet.ts");

    expect(runner).to.include("closeGrowthBounty");
    expect(runner).to.include("tokenAmountOrClosed");
    expect(runner).to.include("afterClose");
    expect(smoke).to.include("--close-check");
    expect(verifier).to.include("reward vault token account is still open after close check");
  });

  it("exposes a hosted Causal Commerce relayer endpoint and policy", () => {
    const route = path.join(process.cwd(), "app/src/app/api/launch/relayer/causal-commerce/route.ts");
    const server = readRepoFile("app/src/lib/launch/server.ts");

    expect(existsSync(route)).to.equal(true);
    expect(server).to.include("createCausalCommerceSponsoredIntent");
    expect(server).to.include("close_growth_bounty");
    expect(server).to.include("CAUSAL_COMMERCE_REQUIRED_ACCOUNTS");
  });

  it("documents week 30-40 completion for judges", () => {
    const completion = readRepoFile("docs/week-30-40-completion.md");

    expect(completion).to.include("close_growth_bounty");
    expect(completion).to.include("hosted relayer");
    expect(completion).to.include("vault account close");
  });
});
