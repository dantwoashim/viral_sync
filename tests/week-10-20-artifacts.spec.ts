import { readFileSync } from "fs";
import path from "path";
import { expect } from "chai";

function readRepoFile(filePath: string) {
  return readFileSync(path.join(process.cwd(), filePath), "utf8");
}

describe("week 10-20 localnet evidence artifacts", () => {
  it("exposes the smoke, graph, and evidence commands", () => {
    const pkg = JSON.parse(readRepoFile("package.json")) as { scripts: Record<string, string> };

    expect(pkg.scripts["localnet:smoke"]).to.equal("ts-node scripts/smoke-localnet-causal-commerce.ts");
    expect(pkg.scripts["localnet:proof-graph"]).to.equal("ts-node scripts/export-localnet-proof-graph.ts");
    expect(pkg.scripts["localnet:evidence-report"]).to.equal("ts-node scripts/write-localnet-evidence-report.ts");
  });

  it("keeps verifier output available for judge evidence generation", () => {
    const verifier = readRepoFile("scripts/verify-causal-receipt-localnet.ts");

    expect(verifier).to.include("--output <path>");
    expect(verifier).to.include("writeJson(options.outputPath");
    expect(verifier).to.include("failures");
  });

  it("guards the RecordCausalReceipt seed annotation against positional argument drift", () => {
    const source = readRepoFile("programs/viral_sync/src/instructions/causal_commerce.rs");
    const contextStart = source.indexOf("pub struct RecordCausalReceipt");
    const annotationStart = source.lastIndexOf("#[instruction(", contextStart);
    const annotation = source.slice(annotationStart, contextStart);

    expect(annotation).to.include("receipt_id_hash");
    expect(annotation).to.include("parent_receipt_id_hash");
    expect(annotation).to.include("referrer_commitment");
    expect(annotation).to.include("claimer_nullifier_hash");
    expect(annotation.indexOf("parent_receipt_id_hash")).to.be.lessThan(annotation.indexOf("claimer_nullifier_hash"));
  });

  it("documents the generated proof packet", () => {
    const docsIndex = readRepoFile("docs/README.md");
    const completion = readRepoFile("docs/week-10-20-completion.md");

    expect(docsIndex).to.include("Localnet evidence report");
    expect(docsIndex).to.include("Localnet proof graph");
    expect(completion).to.include("Validator-Found Bug Fix");
    expect(completion).to.include("SPL vault custody remains the next hardening step");
    expect(docsIndex).to.include("Week 20-30 completion");
  });
});
