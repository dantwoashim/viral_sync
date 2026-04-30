import { getBackupDemoRecording, getBusinessQaBank, getExternalMockJudging, getFinalArchitectureVisuals, getFinalBugOnlyDay, getFinalLinkAudit, getFinalPitchDeckOutline, getFinalTechnicalDeepDive, getFinalVideoRecordingPlan, getFollowUpDemoReadiness, getJudgeQaBank, getKnownLimitationsPage, getLiveDemoRehearsal, getPostSubmissionOperatingPlan365, getReleaseCandidateSnapshot, getSecurityQaBank, getSubmissionDryRun, getSubmitPackageArchive, getTechnicalQaBank, getWeeklyAssetReviewFinal, getWeeklyFreezeReviewFinal, getWeeklyQaReview } from '@/lib/launch/server';

export default function FinalPackagePage() {
  const video = getFinalVideoRecordingPlan();
  const deepDive = getFinalTechnicalDeepDive();
  const deck = getFinalPitchDeckOutline();
  const visuals = getFinalArchitectureVisuals();
  const assets = getWeeklyAssetReviewFinal();
  const judge = getJudgeQaBank();
  const technical = getTechnicalQaBank();
  const business = getBusinessQaBank();
  const security = getSecurityQaBank();
  const rehearsal = getLiveDemoRehearsal();
  const mock = getExternalMockJudging();
  const qa = getWeeklyQaReview();
  const rc = getReleaseCandidateSnapshot();
  const backup = getBackupDemoRecording();
  const links = getFinalLinkAudit();
  const limitations = getKnownLimitationsPage();
  const dryRun = getSubmissionDryRun();
  const bugOnly = getFinalBugOnlyDay();
  const freeze = getWeeklyFreezeReviewFinal();
  const submit = getSubmitPackageArchive();
  const followUp = getFollowUpDemoReadiness();
  const operating = getPostSubmissionOperatingPlan365();

  return (
    <div className="surface"><div className="surface-inner">
      <div className="surface-header"><div className="surface-title-block"><div className="eyebrow">Final Package</div><h1 className="surface-title">Video, Q&A, freeze, submission, and post-submission operating plan.</h1><p className="surface-subtitle">Submit status: {submit.submitted ? 'archived' : 'draft'}; freeze: {freeze.goNoGo}.</p></div></div>
      <div className="merchant-grid">
        <section className="paper-sheet sheet-pad"><div className="ticket-title">Assets</div><p className="sheet-copy" style={{ marginTop: 12 }}>Video: {video.take}; captions {video.captions.length}. Deck: {deck.slideCount} slides. Visuals: {visuals.exports.length} exports.</p><p className="sheet-copy" style={{ marginTop: 12 }}>Weekly asset review: {assets.assets.join(', ')}.</p></section>
        <section className="paper-sheet sheet-pad"><div className="ticket-title">Q&A</div><p className="sheet-copy" style={{ marginTop: 12 }}>Judge: {judge.questions.join(', ')}.</p><p className="sheet-copy" style={{ marginTop: 12 }}>Technical: {technical.questions.join(', ')}. Security: {security.answer}</p></section>
      </div>
      <section className="metric-stack" style={{ marginTop: 18 }}>
        <div className="metric-line"><div className="metric-label"><strong>Rehearsal seconds</strong><span>{mock.fixedTopConfusion}</span></div><div className="metric-value">{rehearsal.durationSeconds}</div></div>
        <div className="metric-line"><div className="metric-label"><strong>Broken links</strong><span>{links.links.join(', ')}</span></div><div className="metric-value">{links.brokenLinks}</div></div>
        <div className="metric-line"><div className="metric-label"><strong>Backlog tiers</strong><span>{operating.liveDemoHealthCheck.join(', ')}</span></div><div className="metric-value">{Object.keys(operating.backlog).length}</div></div>
      </section>
      <section className="ticket-sheet sheet-pad" style={{ marginTop: 18 }}><div className="ticket-title">Freeze and follow-up</div><p className="ticket-note" style={{ marginTop: 12 }}>RC: {rc.tag}; backup playback {backup.playbackTested ? 'tested' : 'not tested'}; dry-run {dryRun.surpriseRisk}; follow-up envs {followUp.environments.join(', ')}.</p><p className="ticket-note" style={{ marginTop: 12 }}>Bug-only policy: {bugOnly.allowedChanges.join(', ')}. Limitations: {limitations.limitations.join(', ')}. Q&A finalized: {qa.ready ? 'yes' : 'no'}. Business Q&A: {business.credibility}. Deep dive: {deepDive.sections.join(', ')}.</p></section>
    </div></div>
  );
}
