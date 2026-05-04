import { fetchCausalGraph, verifyReceipt, type ReceiptVerification } from 'viral-sync-sdk';

function argValue(args: string[], name: string) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const baseUrl = argValue(args, '--base-url') ?? 'http://localhost:3000';
  const receiptId = argValue(args, '--receipt');
  if (!receiptId) {
    throw new Error('Provide --receipt <id>.');
  }

  const receiptResponse = await fetch(new URL(`/api/actions/causal-receipt/${encodeURIComponent(receiptId)}`, baseUrl));
  if (!receiptResponse.ok) {
    throw new Error(`Receipt verification request failed: ${receiptResponse.status}`);
  }

  const receipt = await receiptResponse.json() as ReceiptVerification;
  const graph = await fetchCausalGraph(baseUrl);
  console.log(JSON.stringify({
    receiptId,
    verified: verifyReceipt(receipt),
    receiptPda: receipt.receiptPda,
    settlementStatus: receipt.settlementStatus,
    graphNodes: graph.nodes.length,
    graphEdges: graph.edges.length,
  }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
