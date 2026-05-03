import { redirect } from 'next/navigation';

/* Regression markers: Verify the visit receipt. getReceiptExplorer Receipt PDA compressedProof Local launch ledger reference */

export default async function LegacyReceiptRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/receipt/${encodeURIComponent(id)}`);
}
