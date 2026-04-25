import { Keypair, PublicKey } from "@solana/web3.js";
import { expect } from "chai";

const PROGRAM_ID = new PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");
const INBOUND_BUFFER_SIZE = 16;

function findTokenGenerationPda(mint: PublicKey, owner: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("gen_v4"), mint.toBuffer(), owner.toBuffer()],
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
});
