import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { PremiumNav, PremiumShell, PremiumStatusBadge, PremiumSurface } from '@/components/premium/PremiumUi';

type InvariantRow = {
  id: string;
  testedBy?: string;
  status?: string;
  invariant?: string;
  whyItMatters?: string;
  enforcedBy?: string;
  proofEvidence?: string;
};
type InvariantMatrix = { rows?: InvariantRow[] };

function load(): InvariantMatrix {
  for (const file of [path.join(/* turbopackIgnore: true */ process.cwd(), 'public', 'proofs', 'invariant-matrix.json'), path.join(/* turbopackIgnore: true */ process.cwd(), 'app', 'public', 'proofs', 'invariant-matrix.json')]) {
    if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')) as InvariantMatrix;
  }
  return { rows: [] };
}

export default function InvariantsPage() {
  const rows = load().rows ?? [];
  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-proof-console">
        <span className="premium-eyebrow">Invariant Matrix</span>
        <h1 className="premium-proof-title">Audit-grade constraints, not vibes.</h1>
        <p className="premium-lede">Every POC-1 receipt should be explainable by a concrete invariant, enforcement point, test case, and proof artifact.</p>
        <section className="premium-gauntlet-list">
          {rows.map((row) => (
            <PremiumSurface key={row.id} tone="light" className="premium-gauntlet-case">
              <div>
                <div className="premium-case-topline">
                  <span>{row.testedBy}</span>
                  <PremiumStatusBadge tone="success">{row.status}</PremiumStatusBadge>
                </div>
                <h2>{row.invariant}</h2>
                <p>{row.whyItMatters}</p>
              </div>
              <div className="premium-gauntlet-evidence">
                <span>Enforced by</span>
                <code>{row.enforcedBy}</code>
                <small>{row.proofEvidence}</small>
              </div>
            </PremiumSurface>
          ))}
        </section>
      </section>
    </PremiumShell>
  );
}
