import { Keypair, PublicKey } from "@solana/web3.js";
import { expect } from "chai";

const PROGRAM_ID = new PublicKey("8D5chmUeb97oxykaBv7CTFpZnBotVAMnqYAvyk6qcQz9");
const INBOUND_BUFFER_SIZE = 16;
const MAX_REFERRER_SLOTS = 4;

function findTokenGenerationPda(mint: PublicKey, owner: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("gen_v4"), mint.toBuffer(), owner.toBuffer()],
    PROGRAM_ID,
  );
}

function findMerchantConfigPda(mint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("merchant_v4"), mint.toBuffer()],
    PROGRAM_ID,
  );
}

function findCommissionLedgerPda(referrer: PublicKey, merchant: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("commission_ledger"), referrer.toBuffer(), merchant.toBuffer()],
    PROGRAM_ID,
  );
}

function findSessionKeyPda(authority: PublicKey, delegatedSigner: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("session"), authority.toBuffer(), delegatedSigner.toBuffer()],
    PROGRAM_ID,
  );
}

function simulateInboundWrites(amounts: number[]) {
  let pending = 0;
  let attributed = 0;
  let deadPass = 0;

  for (const amount of amounts) {
    if (pending >= INBOUND_BUFFER_SIZE) {
      deadPass += amount;
      continue;
    }

    pending += 1;
    attributed += amount;
  }

  return { pending, attributed, deadPass };
}

function simulateRedemptionSlotSettlement(activeSlots: number, settledSlots: number[]) {
  if (activeSlots < 0 || activeSlots > MAX_REFERRER_SLOTS) {
    throw new Error("invalid active slot count");
  }

  let mask = 0;
  for (const slot of settledSlots) {
    if (slot < 0 || slot >= activeSlots) {
      throw new Error("invalid referrer slot");
    }
    const bit = 1 << slot;
    if ((mask & bit) !== 0) {
      throw new Error("slot already settled");
    }
    mask |= bit;
  }

  const requiredMask = activeSlots === 0 ? 0 : (1 << activeSlots) - 1;
  return {
    mask,
    requiredMask,
    canClear: mask === requiredMask,
  };
}

function applyCommission(
  ledger: { claimable: number; dustTenths: number; totalEarned: number; totalRedemptionsDriven: number; highestSingleCommission: number },
  gen2Consumed: number,
  commissionBps: number,
) {
  const exact = gen2Consumed * commissionBps;
  const whole = Math.floor(exact / 10_000);
  const dust = exact % 10_000;

  ledger.claimable += whole;
  ledger.dustTenths += dust;
  if (ledger.dustTenths >= 10_000) {
    const bonusWhole = Math.floor(ledger.dustTenths / 10_000);
    ledger.claimable += bonusWhole;
    ledger.totalEarned += bonusWhole;
    ledger.dustTenths %= 10_000;
  }

  ledger.totalEarned += whole;
  ledger.totalRedemptionsDriven += 1;
  ledger.highestSingleCommission = Math.max(ledger.highestSingleCommission, whole);
  return ledger;
}

function grossUpForTransferFee(netClaimable: number, transferFeeBps: number) {
  if (transferFeeBps >= 10_000) {
    throw new Error("invalid transfer fee");
  }

  return Math.floor((netClaimable * 10_000) / (10_000 - transferFeeBps));
}

type ClaimStatus = "claimed" | "code-generated" | "redeemed" | "blocked";

interface SimReferral {
  token: string;
  referrerSessionId: string;
  referrerDeviceFingerprint: string;
}

interface SimClaim {
  id: string;
  referralToken: string;
  claimerSessionId: string;
  deviceFingerprint: string;
  status: ClaimStatus;
  code?: string;
}

function claimReferralForLaunch(
  referral: SimReferral,
  claims: SimClaim[],
  claimerSessionId: string,
  deviceFingerprint: string,
) {
  if (claimerSessionId === referral.referrerSessionId || deviceFingerprint === referral.referrerDeviceFingerprint) {
    const blocked: SimClaim = {
      id: `claim-${claims.length + 1}`,
      referralToken: referral.token,
      claimerSessionId,
      deviceFingerprint,
      status: "blocked",
    };
    claims.push(blocked);
    return blocked;
  }

  const existing = claims.find((claim) => claim.claimerSessionId === claimerSessionId && claim.status !== "blocked");
  if (existing) {
    return existing;
  }

  const claim: SimClaim = {
    id: `claim-${claims.length + 1}`,
    referralToken: referral.token,
    claimerSessionId,
    deviceFingerprint,
    status: "claimed",
  };
  claims.push(claim);
  return claim;
}

function generateRedeemCodeForLaunch(claim: SimClaim) {
  if (claim.status === "blocked") {
    throw new Error("blocked claims cannot receive redeem codes");
  }

  if (!claim.code) {
    claim.code = claim.id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase().padStart(6, "0");
    claim.code = `${claim.code.slice(0, 3)}-${claim.code.slice(3)}`;
  }
  claim.status = claim.status === "redeemed" ? "redeemed" : "code-generated";
  return claim.code;
}

function confirmRedeemCodeForLaunch(claims: SimClaim[], code: string) {
  const normalized = code.replace(/[^a-z0-9]/gi, "").toUpperCase();
  const formatted = `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
  const claim = claims.find((item) => item.code === formatted);
  if (!claim || claim.status === "blocked") {
    return false;
  }

  claim.status = "redeemed";
  return true;
}

describe("viral_sync_v4_core", () => {
  it("derives TokenGeneration PDAs from mint and true owner", () => {
    const mint = Keypair.generate().publicKey;
    const owner = Keypair.generate().publicKey;
    const delegatedSigner = Keypair.generate().publicKey;

    const [ownerPda] = findTokenGenerationPda(mint, owner);
    const [delegatedPda] = findTokenGenerationPda(mint, delegatedSigner);

    expect(ownerPda.toBase58()).to.not.equal(delegatedPda.toBase58());
    expect(ownerPda.equals(PublicKey.default)).to.equal(false);
  });

  it("degrades inbound overflow into dead-pass accounting", () => {
    const transfers = Array.from({ length: 18 }, () => 1);
    const result = simulateInboundWrites(transfers);

    expect(result.pending).to.equal(INBOUND_BUFFER_SIZE);
    expect(result.attributed).to.equal(16);
    expect(result.deadPass).to.equal(2);
  });

  it("derives MerchantConfig PDAs from mint rather than merchant authority", () => {
    const mint = Keypair.generate().publicKey;
    const merchant = Keypair.generate().publicKey;
    const [mintPda] = findMerchantConfigPda(mint);
    const [wrongAuthorityPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("merchant_v4"), merchant.toBuffer()],
      PROGRAM_ID,
    );

    expect(mintPda.equals(wrongAuthorityPda)).to.equal(false);
  });

  it("keeps commission ledgers isolated per referrer and merchant", () => {
    const merchant = Keypair.generate().publicKey;
    const otherMerchant = Keypair.generate().publicKey;
    const referrer = Keypair.generate().publicKey;
    const otherReferrer = Keypair.generate().publicKey;

    const [ledger] = findCommissionLedgerPda(referrer, merchant);
    const [otherLedger] = findCommissionLedgerPda(otherReferrer, merchant);
    const [merchantLedger] = findCommissionLedgerPda(referrer, otherMerchant);

    expect(ledger.toBase58()).to.not.equal(otherLedger.toBase58());
    expect(ledger.toBase58()).to.not.equal(merchantLedger.toBase58());
  });

  it("derives session keys from both authority and delegated signer", () => {
    const authority = Keypair.generate().publicKey;
    const delegate = Keypair.generate().publicKey;
    const otherDelegate = Keypair.generate().publicKey;

    const [session] = findSessionKeyPda(authority, delegate);
    const [otherSession] = findSessionKeyPda(authority, otherDelegate);

    expect(session.toBase58()).to.not.equal(otherSession.toBase58());
  });

  it("requires every active redemption slot to settle before clearing the pending lock", () => {
    const partial = simulateRedemptionSlotSettlement(3, [0, 2]);
    const complete = simulateRedemptionSlotSettlement(3, [0, 1, 2]);

    expect(partial.mask).to.equal(5);
    expect(partial.requiredMask).to.equal(7);
    expect(partial.canClear).to.equal(false);
    expect(complete.canClear).to.equal(true);
  });

  it("rejects duplicate redemption slot settlement", () => {
    expect(() => simulateRedemptionSlotSettlement(2, [0, 0])).to.throw("slot already settled");
  });

  it("rolls fractional commission dust into claimable tokens", () => {
    const ledger = {
      claimable: 0,
      dustTenths: 0,
      totalEarned: 0,
      totalRedemptionsDriven: 0,
      highestSingleCommission: 0,
    };

    applyCommission(ledger, 1, 3333);
    applyCommission(ledger, 1, 3333);
    applyCommission(ledger, 1, 3334);

    expect(ledger.claimable).to.equal(1);
    expect(ledger.dustTenths).to.equal(0);
    expect(ledger.totalEarned).to.equal(1);
    expect(ledger.totalRedemptionsDriven).to.equal(3);
  });

  it("tracks highest single commission separately from dust rollover", () => {
    const ledger = {
      claimable: 0,
      dustTenths: 0,
      totalEarned: 0,
      totalRedemptionsDriven: 0,
      highestSingleCommission: 0,
    };

    applyCommission(ledger, 1000, 500);
    applyCommission(ledger, 99, 5000);

    expect(ledger.claimable).to.equal(99);
    expect(ledger.highestSingleCommission).to.equal(50);
    expect(ledger.totalRedemptionsDriven).to.equal(2);
  });

  it("grosses up commission payouts to cover Token-2022 transfer fees", () => {
    const gross = grossUpForTransferFee(9_500, 500);
    expect(gross).to.equal(10_000);
  });

  it("rejects impossible transfer-fee gross-up settings", () => {
    expect(() => grossUpForTransferFee(1, 10_000)).to.throw("invalid transfer fee");
  });

  it("blocks same-device self-referral in the launch ledger flow", () => {
    const referral = {
      token: "referral-alpha",
      referrerSessionId: "session-alpha",
      referrerDeviceFingerprint: "device-alpha",
    };
    const claims: SimClaim[] = [];
    const claim = claimReferralForLaunch(referral, claims, "guest-1", "device-alpha");

    expect(claim.status).to.equal("blocked");
    expect(claims).to.have.length(1);
  });

  it("reuses an existing active launch claim instead of duplicating attribution", () => {
    const referral = {
      token: "referral-alpha",
      referrerSessionId: "session-alpha",
      referrerDeviceFingerprint: "device-alpha",
    };
    const claims: SimClaim[] = [];
    const first = claimReferralForLaunch(referral, claims, "guest-1", "device-guest-1");
    const second = claimReferralForLaunch(referral, claims, "guest-1", "device-guest-1");

    expect(first.id).to.equal(second.id);
    expect(claims).to.have.length(1);
  });

  it("normalizes merchant redeem codes before confirmation", () => {
    const referral = {
      token: "referral-alpha",
      referrerSessionId: "session-alpha",
      referrerDeviceFingerprint: "device-alpha",
    };
    const claims: SimClaim[] = [];
    const claim = claimReferralForLaunch(referral, claims, "guest-1", "device-guest-1");
    const code = generateRedeemCodeForLaunch(claim);
    const ok = confirmRedeemCodeForLaunch(claims, code.replace("-", "").toLowerCase());

    expect(ok).to.equal(true);
    expect(claim.status).to.equal("redeemed");
  });
});
