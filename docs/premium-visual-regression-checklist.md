# Premium Visual Regression Checklist

This checklist is the week 38 gate for the premium redesign. It prevents polished routes from drifting back into clipped, blank, slow-feeling, or internally worded UI.

## Automated Gate

Run the app locally, then run:

```bash
npm run premium:screenshots
npm run premium:visual-gate
```

The screenshot command captures desktop and mobile viewports for:

- `/`
- `/demo`
- `/invite`
- `/redeem`
- `/merchant/scan`
- `/causal-graph`
- `/merchant/today`
- `/merchant/campaigns`
- `/merchant/ledger`
- `/admin/relayer`
- `/developer`
- `/example-receipt-graph`

The visual gate fails when any capture has:

- Horizontal overflow.
- Missing or tiny page text.
- Missing meaningful `h1`.
- Old consumer/passbook chrome on premium workspace routes.
- Banned internal copy.
- Missing focus-visible CSS.

## Manual Review

For every route above, check:

- The first viewport has one obvious primary action.
- Long proof values wrap or truncate intentionally.
- Mobile controls stay reachable at 390px.
- Empty, pending, success, and error states feel designed.
- Motion uses transform and opacity only.
- Reduced motion disables non-essential animation.
- Buttons and links have visible focus states.
- No route explains itself with implementation-week language.

## Evidence

Screenshot manifests should live under:

```text
tmp/premium-screenshots/manifest.json
```

Completion-specific screenshots may also be stored under a tranche folder such as:

```text
tmp/premium-week-29-38-screenshots/manifest.json
```
