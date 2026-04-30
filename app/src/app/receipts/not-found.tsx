import Link from 'next/link';

export default function ReceiptNotFound() {
  return (
    <main className="proof-page">
      <section className="proof-hero">
        <span>Receipt not found</span>
        <h1>This proof is not in the launch ledger.</h1>
        <p>Confirm a redeem code from the merchant scan terminal, then open the generated receipt reference.</p>
        <div className="proof-actions">
          <Link href="/merchant/scan">Open scan terminal</Link>
          <Link href="/causal-graph">Open graph</Link>
        </div>
      </section>
    </main>
  );
}
