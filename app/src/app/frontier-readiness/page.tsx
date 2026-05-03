import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { PremiumButton, PremiumMetric, PremiumNav, PremiumShell, PremiumStatusBadge, PremiumSurface } from '@/components/premium/PremiumUi';

type Gate = { id: string; label: string; status: 'PASS' | 'PENDING' | 'FAIL'; detail: string };
type Readiness = { status?: string; gates?: Gate[] };

function load(): Readiness {
  for (const file of [path.join(/* turbopackIgnore: true */ process.cwd(), 'public', 'proofs', 'frontier-readiness.json'), path.join(/* turbopackIgnore: true */ process.cwd(), 'app', 'public', 'proofs', 'frontier-readiness.json')]) {
    if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')) as Readiness;
  }
  return { status: 'MISSING', gates: [] };
}

function tone(status: Gate['status']) { return status === 'PASS' ? 'success' : status === 'PENDING' ? 'warning' : 'danger'; }

export default function FrontierReadinessPage() {
  const data = load();
  const gates = data.gates ?? [];
  return (
    <PremiumShell>
      <PremiumNav />
      <section className="premium-proof-console">
        <span className="premium-eyebrow">Final run readiness</span>
        <h1 className="premium-proof-title">{data.status ?? 'MISSING'}</h1>
        <p className="premium-lede">This page shows whether the repo is ready for the last devnet proof run without pretending the proof is fresh.</p>
        <div className="premium-actions">
          <PremiumButton href="/frontier">Frontier command center</PremiumButton>
          <PremiumButton href="/frontier-proof" variant="secondary">Live proof</PremiumButton>
        </div>
        <section className="premium-metrics compact">
          <PremiumMetric label="Gates" value={`${gates.filter((gate) => gate.status === 'PASS').length}/${gates.length}`} detail="Prepared gates" />
          <PremiumMetric label="Final command" value="frontier:final" detail="Build, deploy, prove, verify" />
        </section>
        <section className="premium-gauntlet-list">
          {gates.map((gate) => (
            <PremiumSurface key={gate.id} tone="light" className="premium-gauntlet-case">
              <div>
                <div className="premium-case-topline">
                  <span>{gate.id}</span>
                  <PremiumStatusBadge tone={tone(gate.status)}>{gate.status}</PremiumStatusBadge>
                </div>
                <h2>{gate.label}</h2>
                <p>{gate.detail}</p>
              </div>
            </PremiumSurface>
          ))}
        </section>
      </section>
    </PremiumShell>
  );
}
