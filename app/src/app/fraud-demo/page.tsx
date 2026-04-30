import { getFraudReplaySummary } from '@/lib/launch/server';

export default async function FraudDemoPage() {
  const summary = await getFraudReplaySummary();

  return (
    <main className="proof-page">
      <section className="proof-hero">
        <span>Fraud / Replay Demo</span>
        <h1>What the launch guardrails reject.</h1>
        <p>Visible counters for consumed challenges, expired challenges, duplicate nullifiers, and blocked claims.</p>
      </section>

      <section className="proof-grid">
        <article><span>Consumed challenges</span><strong>{summary.consumedChallenges}</strong></article>
        <article><span>Expired challenges</span><strong>{summary.expiredChallenges}</strong></article>
        <article><span>Active challenges</span><strong>{summary.activeChallenges}</strong></article>
        <article><span>Blocked claims</span><strong>{summary.blockedClaims}</strong></article>
        <article><span>Duplicate nullifier attempts</span><strong>{summary.duplicateNullifierAttempts}</strong></article>
        <article><span>Causal receipts</span><strong>{summary.receiptCount}</strong></article>
      </section>

      <section className="proof-table">
        <div><span>Expired challenge</span><code>Rejected once the one-time counter challenge passes its TTL.</code></div>
        <div><span>Consumed challenge</span><code>Rejected after merchant confirmation consumes it.</code></div>
        <div><span>Duplicate nullifier</span><code>Reused claims resolve to the existing active claim instead of creating new attribution.</code></div>
      </section>
    </main>
  );
}
