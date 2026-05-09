# Security Policy

## Current Launch Security Status

Viral Sync is not audited for mainnet funds. The Frontier build now includes a P0 auth baseline:

- server-issued guest session cookie;
- production merchant login requires a non-demo access token;
- local demo staff PIN fallback is disabled in production by default;
- merchant session records with owner, manager, staff, support, and auditor roles;
- staff device enrollment/revocation records;
- production staff confirmation requires an enrolled staff device;
- audit events for sensitive actions;
- append-only reward ledger entries;
- idempotency records for retry-sensitive mutations.
- runtime validation for public mutations;
- common API error shape with request ids;
- CSRF origin checks for sensitive cookie/mutation routes;
- browser security headers on sensitive responses.

Remaining production work:

- replace pilot access-token login with SSO/passwordless auth before broad enterprise rollout;
- store sessions and staff devices in normalized Postgres tables;
- use enrolled device signatures instead of demo HMAC signatures;
- complete external audit before mainnet funds;
- wire live on-chain receipt submission and settlement monitoring.
- keep the Day 140 security gate blocked while unresolved P0/P1 issues remain;
- move upgrade authority to multisig before uncapped beta.
- keep `docs/production-readiness.md` and `docs/auditor-start-here.md` current for every release candidate.

## Inspectable Security Materials

The repository includes the security materials that are currently inspectable:

- GitHub security scanning workflow in `.github/workflows/security-scan.yml`;
- production readiness gates in `docs/production-readiness.md`;
- auditor entrypoint in `docs/auditor-start-here.md`;
- scoped POC-1 program surface in `docs/program-scope.md`;
- current proof limitations in `docs/KNOWN_LIMITATIONS.md`.

Viral Sync is a devnet/prototype project. It is not audited for mainnet funds.

## Current Dependency Audit Note

`npm audit fix` has been applied. The remaining audit finding is upstream: `@coinbase/cdp-sdk@1.48.2`, pulled by the relayer's x402 packages, pins `axios@1.13.6`. Viral Sync no longer advertises paid x402 campaign creation as implemented, and the relayer build remains isolated from the core proof gate. Upgrade or remove the Coinbase x402 dependency before treating paid relayer routes as production security surface.

## Reporting a vulnerability

Please report sensitive issues privately through GitHub security advisories if available. Do not publish exploit details in public issues.

## Scope

Security-sensitive areas include:

- Anchor program instruction validation
- account constraints and signer checks
- relayer authentication and transaction sponsorship
- wallet/key handling
- hosted Actions API behavior

## Mainnet warning

Do not use this project with real funds without external security review, local-validator test hardening, production wallet operations, monitoring, and incident response planning.

