import { getAuditPrepChecklist, getDeploymentRehearsal, getDisclosureUpdateDocs, getExternalReviewRound, getFormalAuditPrepChecklist, getFormalCoverageExpansion, getFormalDisclosureUpdate, getFormalExternalReviewRound, getFormalHighSeverityFixes, getFormalInvariantDocumentation, getHighSeverityFixesDay243, getIncidentRunbooks, getInvariantDocumentation, getMainnetBetaScope, getMigrationRehearsal, getProgramSecurityReview, getSecurityGate, getTestCoverageExpansion, getThreatModelV2, getUpgradeAuthorityPolicy, getWeeklySecurityReview } from '@/lib/launch/server';

export default function SecurityGatePage() {
  const threat = getThreatModelV2();
  const gate = getSecurityGate();
  const program = getProgramSecurityReview();
  const beta = getMainnetBetaScope();
  const upgrade = getUpgradeAuthorityPolicy();
  const deploy = getDeploymentRehearsal();
  const migration = getMigrationRehearsal();
  const incidents = getIncidentRunbooks();
  const audit = getAuditPrepChecklist();
  const invariants = getInvariantDocumentation();
  const coverage = getTestCoverageExpansion();
  const external = getExternalReviewRound();
  const fixes = getHighSeverityFixesDay243();
  const disclosure = getDisclosureUpdateDocs();
  const weeklySecurity = getWeeklySecurityReview();
  const formalAudit = getFormalAuditPrepChecklist();
  const formalInvariants = getFormalInvariantDocumentation();
  const formalCoverage = getFormalCoverageExpansion();
  const formalExternal = getFormalExternalReviewRound();
  const formalFixes = getFormalHighSeverityFixes();
  const formalDisclosure = getFormalDisclosureUpdate();

  return (
    <div className="surface">
      <div className="surface-inner">
        <div className="surface-header">
          <div className="surface-title-block">
            <div className="eyebrow">Security gate</div>
            <h1 className="surface-title">{gate.mainnetAllowed ? 'Mainnet gate clear' : 'Mainnet gate blocked'}</h1>
            <p className="surface-subtitle">{gate.rule}</p>
          </div>
        </div>

        <div className="merchant-grid">
          <section className="paper-sheet sheet-pad">
            <div className="eyebrow">Threat model v2</div>
            <div className="campaign-sequence">
              {threat.attacks.map((attack, index) => (
                <div className="campaign-sequence-step" key={attack.name}>
                  <span>{attack.unresolved ? '!' : String(index + 1).padStart(2, '0')}</span>
                  <div><strong>{attack.name}</strong><p>{attack.mitigation}</p></div>
                </div>
              ))}
            </div>
          </section>

          <section className="paper-sheet sheet-pad">
            <div className="eyebrow">Program security</div>
            <div className="campaign-sequence">
              {[...program.accountConstraints, ...program.signerChecks, ...program.settlementInvariants].map((item, index) => (
                <div className="campaign-sequence-step" key={item}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div><strong>Review item</strong><p>{item}</p></div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}>
          <div className="eyebrow">Capped beta and authority</div>
          <div className="ticket-title" style={{ marginTop: 10 }}>Cap NPR {beta.cappedFundsNpr}; allowlist {beta.allowlistedMerchants.join(', ')}</div>
          <p className="ticket-note" style={{ marginTop: 14 }}>{beta.disclosure}</p>
          <p className="sheet-copy" style={{ marginTop: 10 }}>Upgrade: {upgrade.multisigPlan}. Emergency: {upgrade.emergencyPause}</p>
        </section>

        <div className="merchant-grid" style={{ marginTop: 18 }}>
          <section className="paper-sheet sheet-pad">
            <div className="eyebrow">Deployment rehearsal</div>
            <p className="sheet-copy">{deploy.command}</p>
            <div className="campaign-sequence">
              {deploy.steps.map((step, index) => (
                <div className="campaign-sequence-step" key={step}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{step}</strong><p>{deploy.evidence[index] ?? 'record evidence'}</p></div></div>
              ))}
            </div>
          </section>

          <section className="paper-sheet sheet-pad">
            <div className="eyebrow">Migration rehearsal</div>
            <p className="sheet-copy">{migration.rollback}</p>
            <div className="campaign-sequence">
              {migration.checks.map((check, index) => (
                <div className="campaign-sequence-step" key={check}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{check}</strong><p>{migration.steps[index] ?? 'verify'}</p></div></div>
              ))}
            </div>
          </section>
        </div>

        <section className="paper-sheet sheet-pad" style={{ marginTop: 18 }}>
          <div className="eyebrow">Incident runbooks</div>
          <div className="campaign-sequence">
            {incidents.map((item) => (
              <div className="campaign-sequence-step" key={item.incident}>
                <span>IR</span>
                <div><strong>{item.incident}</strong><p>{item.firstAction}. Escalation: {item.escalation}.</p></div>
              </div>
            ))}
          </div>
        </section>

        <section className="paper-sheet sheet-pad" style={{ marginTop: 18 }}>
          <div className="eyebrow">Audit prep and disclosure</div>
          <div className="campaign-sequence">
            {audit.scope.map((item) => (
              <div className="campaign-sequence-step" key={item}><span>AUD</span><div><strong>{item}</strong><p>{audit.artifacts[0]}</p></div></div>
            ))}
            {Object.entries(invariants).slice(0, 4).map(([key, value]) => (
              <div className="campaign-sequence-step" key={key}><span>INV</span><div><strong>{key}</strong><p>{value}</p></div></div>
            ))}
          </div>
          <p className="sheet-copy" style={{ marginTop: 12 }}>{coverage.coverageReport}</p>
          <p className="sheet-copy" style={{ marginTop: 12 }}>External issues: {external.issueTracker.length}; high patched: {fixes.patched.length}.</p>
          <p className="ticket-note" style={{ marginTop: 12 }}>{disclosure.auditStatus} {disclosure.honestyCheck}</p>
        </section>

        <section className="paper-sheet sheet-pad" style={{ marginTop: 18 }}>
          <div className="eyebrow">Weekly security and formal audit handoff</div>
          <p className="sheet-copy">Decision: {weeklySecurity.decision}. Reward cap NPR {weeklySecurity.mainnetCaps.maxRewardLiabilityNpr}.</p>
          <p className="sheet-copy" style={{ marginTop: 10 }}>Formal phase: {formalAudit.phase}; handoff ready {formalAudit.handoffReady ? 'yes' : 'no'}.</p>
          <p className="sheet-copy" style={{ marginTop: 10 }}>Invariant review: {formalInvariants.reviewStatus}</p>
          <p className="sheet-copy" style={{ marginTop: 10 }}>Coverage targets: {formalCoverage.negativePropertyTargets.join(', ')}.</p>
          <p className="sheet-copy" style={{ marginTop: 10 }}>External tracker: {formalExternal.trackerStatus}; regression {formalFixes.regression ? 'ready' : 'pending'}.</p>
          <p className="ticket-note" style={{ marginTop: 12 }}>Disclosure docs: {formalDisclosure.updatedDocs.join(', ')}.</p>
        </section>
      </div>
    </div>
  );
}
