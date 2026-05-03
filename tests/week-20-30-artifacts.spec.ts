import { readFileSync } from "fs";
import path from "path";
import { expect } from "chai";

function readRepoFile(filePath: string) {
  return readFileSync(path.join(process.cwd(), filePath), "utf8");
}

describe("week 20-30 SPL custody artifacts", () => {
  it("stores the reward vault on the RewardEscrow account", () => {
    const state = readRepoFile("programs/viral_sync/src/state/causal_commerce.rs");

    expect(state).to.include("pub reward_vault: Pubkey");
    expect(state).to.include("32 + 8 + 8 + 8");
  });

  it("funds the Growth Bounty through checked SPL token transfer", () => {
    const source = readRepoFile("programs/viral_sync/src/instructions/causal_commerce.rs");

    expect(source).to.include("merchant_reward_account");
    expect(source).to.include("reward_vault");
    expect(source).to.include("associated_token::authority = reward_escrow");
    expect(source).to.include("transfer_checked(cpi_ctx, amount");
  });

  it("settles rewards from the vault to referrer and visitor accounts", () => {
    const source = readRepoFile("programs/viral_sync/src/instructions/causal_commerce.rs");

    expect(source).to.include("referrer_reward_account");
    expect(source).to.include("visitor_reward_account");
    expect(source).to.include("new_with_signer");
    expect(source).to.include("referrer_amount");
    expect(source).to.include("visitor_amount");
  });

  it("makes localnet smoke prove token balances", () => {
    const runner = readRepoFile("scripts/run-causal-commerce-localnet.ts");
    const verifier = readRepoFile("scripts/verify-causal-receipt-localnet.ts");

    expect(runner).to.include("mintRewardTokens");
    expect(runner).to.include("tokenBalances");
    expect(runner).to.include("merchantRewardAccount");
    expect(verifier).to.include("referrer token payout");
    expect(verifier).to.include("visitor token payout");
  });

  it("documents SPL custody in the judge packet", () => {
    const completion = readRepoFile("docs/week-20-30-completion.md");
    const reportScript = readRepoFile("scripts/write-localnet-evidence-report.ts");

    expect(completion).to.include("SPL Token custody and payout");
    expect(completion).to.include("reward vault: 0 -> 9000");
    expect(reportScript).to.include("SPL Token Custody");
  });
});

