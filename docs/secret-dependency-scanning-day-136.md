# Day 136 Secret / Dependency Scanning

## Shipped

Added `.github/workflows/security-scan.yml`.

## Checks

- `npm audit --audit-level=high`
- grep-based secret pattern scan for private keys, GitHub tokens, Slack tokens, and env secret keys

## Note

This is a baseline scan, not a replacement for GitHub Advanced Security or a dedicated secret scanner.
