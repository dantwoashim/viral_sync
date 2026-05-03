# Premium Release Candidate

Generated: 2026-05-01T16:47:15.857Z

Weeks 39-52 complete the premium product finish: performance pass, accessibility pass 2, visual refinement, copy refinement, timed demo rehearsal, backup package, user-test artifacts, final responsive polish, release candidate, and freeze criteria.

## Commands

```bash
npm run premium:copy
npm run premium:a11y
npm run premium:performance
PREMIUM_VIEWPORT_SET=final PREMIUM_SCREENSHOT_DIR=tmp/premium-week-39-52-screenshots npm run premium:screenshots
npm run premium:visual-gate -- tmp/premium-week-39-52-screenshots/manifest.json --require-final-viewports
npm run premium:release-candidate
npm run premium:final
npm run verify
```

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
- Packet path: `npm run frontier:submission`.
- UI proof path: `/demo` and `/premium-scorecard`.
- Screenshot evidence: `tmp/premium-week-39-52-screenshots/manifest.json`.
- Scorecard: `docs/premium-final-scorecard.md`.

## Freeze Rule

After this release candidate, only blocker fixes can touch the final product surface. Any change to copy, layout, proof state, or navigation must rerun the premium final gate and update this packet.

## Verdict

Release candidate frozen.
