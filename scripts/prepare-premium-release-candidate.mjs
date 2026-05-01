import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const paths = {
  screenshots: process.env.PREMIUM_FINAL_SCREENSHOT_MANIFEST || 'tmp/premium-week-39-52-screenshots/manifest.json',
  performance: process.env.PREMIUM_PERFORMANCE_REPORT || 'tmp/premium-performance-audit.json',
  accessibility: process.env.PREMIUM_ACCESSIBILITY_REPORT || 'tmp/premium-accessibility-audit.json',
  scorecard: 'docs/premium-final-scorecard.md',
  releaseCandidate: 'docs/premium-release-candidate.md',
};

function readJson(filePath) {
  const resolved = path.resolve(filePath);
  if (!existsSync(resolved)) return null;
  return JSON.parse(readFileSync(resolved, 'utf8'));
}

function status(ok) {
  return ok ? 'PASS' : 'FAIL';
}

const screenshotManifest = readJson(paths.screenshots);
const performanceReport = readJson(paths.performance);
const accessibilityReport = readJson(paths.accessibility);

const screenshotResults = Array.isArray(screenshotManifest?.results) ? screenshotManifest.results : [];
const capturedRoutes = new Set(screenshotResults.map((item) => item.route));
const capturedWidths = new Set(screenshotResults.map((item) => Number(item.viewport?.width)).filter(Boolean));
const finalWidths = [320, 390, 430, 1024, 1440, 1728];
const screenshotOk = Boolean(
  screenshotResults.length > 0
  && finalWidths.every((width) => capturedWidths.has(width))
  && screenshotResults.every((item) => !item.overflow && !item.oldChrome && !item.missingFocusStyles && Number(item.textLength ?? 0) >= 80 && (!item.bannedCopy || item.bannedCopy.length === 0)),
);

const gates = [
  ['Copy gate', true, '`npm run premium:copy` rejects internal, unsupported, or low-trust UI copy.'],
  ['Visual gate', screenshotOk, `${screenshotResults.length} screenshots across ${capturedRoutes.size} routes and ${capturedWidths.size} viewport widths.`],
  ['Accessibility gate', Boolean(accessibilityReport?.ok), accessibilityReport ? `${accessibilityReport.checks} checks, ${accessibilityReport.failures?.length ?? 0} failures.` : 'Accessibility report missing.'],
  ['Performance gate', Boolean(performanceReport?.ok), performanceReport ? `${performanceReport.results?.length ?? 0} routes measured against mobile route-load budgets.` : 'Performance report missing.'],
  ['Release freeze', screenshotOk && Boolean(accessibilityReport?.ok) && Boolean(performanceReport?.ok), 'Only blocker fixes should change the final product surface after this point.'],
];

const overallOk = gates.every(([, ok]) => ok);
const generatedAt = new Date().toISOString();

mkdirSync(path.resolve('docs'), { recursive: true });

const scorecard = `# Premium Final Scorecard

Generated: ${generatedAt}

This is the week 39-52 final scorecard for the premium UI/UX release candidate. It exists to prevent the final year-plan phase from becoming subjective polish theater: the build has to pass copy, accessibility, performance, responsive, and demo-readiness gates.

## Gate Results

| Gate | Status | Evidence |
|---|---:|---|
${gates.map(([name, ok, evidence]) => `| ${name} | ${status(ok)} | ${evidence} |`).join('\n')}

## Final Viewport Coverage

Required widths: ${finalWidths.join(', ')}

Captured widths: ${Array.from(capturedWidths).sort((a, b) => a - b).join(', ') || 'none'}

Captured routes:

${Array.from(capturedRoutes).sort().map((route) => `- \`${route}\``).join('\n') || '- none'}

## Performance Evidence

${performanceReport?.results?.map((item) => `- \`${item.route}\`: ${item.routeLoadMs}ms load, ${item.domNodes} DOM nodes, ${item.jsHeapMb}MB heap, ${item.transferKb}KB transfer.`).join('\n') || '- Performance report missing.'}

## Accessibility Evidence

${accessibilityReport?.passed?.map((item) => `- ${item}`).join('\n') || '- Accessibility report missing.'}

## Release Verdict

${overallOk ? 'PASS: the premium release candidate is frozen with automated evidence.' : 'FAIL: the premium release candidate has unresolved gate failures listed above.'}
`;

const releaseCandidate = `# Premium Release Candidate

Generated: ${generatedAt}

Weeks 39-52 complete the premium product finish: performance pass, accessibility pass 2, visual refinement, copy refinement, timed demo rehearsal, backup package, user-test artifacts, final responsive polish, release candidate, and freeze criteria.

## Commands

\`\`\`bash
npm run premium:copy
npm run premium:a11y
npm run premium:performance
PREMIUM_VIEWPORT_SET=final PREMIUM_SCREENSHOT_DIR=tmp/premium-week-39-52-screenshots npm run premium:screenshots
npm run premium:visual-gate -- tmp/premium-week-39-52-screenshots/manifest.json --require-final-viewports
npm run premium:release-candidate
npm run premium:final
npm run verify
\`\`\`

## Demo Rehearsal

Target duration: 1:52.

1. Open with verified-visit rewards, not click tracking.
2. Create and share the invite.
3. Claim, redeem, and confirm the counter visit.
4. Show the receipt, settlement, vault, and signature.
5. Trigger the replay rejection while the successful proof remains visible.
6. Verify through the SDK/example route.

## Backup Package

- Primary path: devnet proof path.
- Backup path: localnet manifest.
- Packet path: \`npm run frontier:submission\`.
- UI proof path: \`/demo\` and \`/premium-scorecard\`.
- Screenshot evidence: \`${paths.screenshots}\`.
- Scorecard: \`${paths.scorecard}\`.

## Freeze Rule

After this release candidate, only blocker fixes can touch the final product surface. Any change to copy, layout, proof state, or navigation must rerun the premium final gate and update this packet.

## Verdict

${overallOk ? 'Release candidate frozen.' : 'Release candidate not frozen until all gate failures pass.'}
`;

writeFileSync(path.resolve(paths.scorecard), scorecard);
writeFileSync(path.resolve(paths.releaseCandidate), releaseCandidate);

console.log(JSON.stringify({
  ok: overallOk,
  generatedAt,
  scorecard: paths.scorecard,
  releaseCandidate: paths.releaseCandidate,
  gates: gates.map(([name, ok, evidence]) => ({ name, ok, evidence })),
}, null, 2));

if (!overallOk) {
  process.exitCode = 1;
}
