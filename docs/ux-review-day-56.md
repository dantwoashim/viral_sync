# UX Review Notes

Day 56 asks for a non-technical demo review. This file captures the current review checklist and confusion points to test.

## Demo Checklist

1. Can a first-time user explain what a Causal Receipt proves?
2. Can they create an invite without reading docs?
3. Can they tell the QR is scannable and the text code is the fallback?
4. Can staff confirm a code with `DEMO-PIN`?
5. Can they open the receipt page and understand the causal path?
6. Can they understand why a replay or duplicate claim is blocked?

## Current Confusion Risks

- Receipt PDA and tx references are still deterministic demo references until live devnet submission is wired.
- Merchant staff auth is still a temporary PIN, despite staff device records existing.
- Camera scanning is represented as QR-ready plus manual fallback, not a full camera scanner.

## Fixes Applied In Day 50-60

- Replaced visual-only QR with scannable QR generation.
- Added explicit scanner/manual fallback copy.
- Added common API error shape with request ids.
- Added runtime validation at public mutation boundaries.
- Added CSRF origin checks and security headers for cookie/sensitive mutations.
