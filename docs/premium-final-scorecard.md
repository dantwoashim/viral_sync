# Premium Final Scorecard

Generated: 2026-05-01T16:47:15.857Z

This is the week 39-52 final scorecard for the premium UI/UX release candidate. It exists to prevent the final year-plan phase from becoming subjective polish theater: the build has to pass copy, accessibility, performance, responsive, and demo-readiness gates.

## Gate Results

| Gate | Status | Evidence |
|---|---:|---|
| Copy gate | PASS | `npm run premium:copy` rejects internal, unsupported, or low-trust UI copy. |
| Visual gate | PASS | 120 screenshots across 20 routes and 6 viewport widths. |
| Accessibility gate | PASS | 9 checks, 0 failures. |
| Performance gate | PASS | 5 routes measured against mobile route-load budgets. |
| Release freeze | PASS | Only blocker fixes should change the final product surface after this point. |

## Final Viewport Coverage

Required widths: 320, 390, 430, 1024, 1440, 1728

Captured widths: 320, 390, 430, 1024, 1440, 1728

Captured routes:

- `/`
- `/admin/relayer`
- `/causal-graph`
- `/demo`
- `/developer`
- `/example-receipt-graph`
- `/examples`
- `/invite`
- `/merchant/campaigns`
- `/merchant/ledger`
- `/merchant/scan`
- `/merchant/today`
- `/passbook`
- `/premium-scorecard`
- `/pricing`
- `/profile`
- `/redeem`
- `/routes`
- `/security`
- `/support`

## Performance Evidence

- `/`: 272ms load, 117 DOM nodes, 2.68MB heap, 290KB transfer.
- `/demo`: 240ms load, 260 DOM nodes, 2.83MB heap, 35KB transfer.
- `/premium-scorecard`: 96ms load, 164 DOM nodes, 2.79MB heap, 35KB transfer.
- `/merchant/scan`: 283ms load, 129 DOM nodes, 2.97MB heap, 31KB transfer.
- `/developer`: 270ms load, 176 DOM nodes, 2.71MB heap, 15KB transfer.

## Accessibility Evidence

- Global focus-visible style
- Reduced motion support
- Async live regions
- Error alert state
- Primary navigation label
- Demo proof quality label
- Demo rehearsal label
- Scorecard metrics label

## Release Verdict

PASS: the premium release candidate is frozen with automated evidence.
