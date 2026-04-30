import Link from 'next/link';
import { searchSupportIndex } from '@/lib/launch/server';

export default async function AdminSupportPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const q = params.q ?? '';
  const results = await searchSupportIndex(q);

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Support console</div>
            <h1 className="surface-title">Search by code, invite, receipt, claim, or merchant.</h1>
            <p className="surface-subtitle">
              Day 75 gives the pilot team a fast read-only console for counter incidents and demo recovery.
            </p>
          </div>
        </div>

        <section className="paper-sheet sheet-pad">
          <form className="field-row" action="/admin/support">
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="support-search">Lookup</label>
              <input id="support-search" name="q" defaultValue={q} placeholder="Try a code, invite token, receipt id, or merchant name" />
            </div>
            <button className="vs-link-chip" type="submit" style={{ alignSelf: 'end' }}>Search</button>
          </form>

          <div className="campaign-sequence" style={{ marginTop: 22 }}>
            {results.length === 0 ? (
              <div className="campaign-sequence-step">
                <span>--</span>
                <div>
                  <strong>{q ? 'No matching pilot record' : 'Enter a lookup value'}</strong>
                  <p>Search returns read-only support records from the current launch ledger.</p>
                </div>
              </div>
            ) : results.map((result) => (
              <div className="campaign-sequence-step" key={`${result.type}-${result.value}`}>
                <span>{result.type.slice(0, 2).toUpperCase()}</span>
                <div>
                  <strong>{result.label} - {result.status}</strong>
                  <p>{result.meta}</p>
                  {result.href && <Link href={result.href}>{result.value}</Link>}
                  {!result.href && <p>{result.value}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
