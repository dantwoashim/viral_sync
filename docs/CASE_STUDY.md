# Case Study: Viral Sync

## Summary

Viral Sync is a Solana devnet referral and loyalty protocol prototype for local merchants. It includes an Anchor program, Next.js app, relayer service, Solana Actions service, client adapters, launch tooling, and protocol tests.

## Problem

Small merchants often want referral and loyalty systems without adopting a large enterprise platform. A blockchain-based prototype can explore transparent reward rules and merchant-funded incentives, but it must be scoped honestly because mainnet money creates serious risk.

## Why this project matters

It demonstrates startup-style product thinking across protocol code, web app, relayer infrastructure, and client integration surfaces.

## My role

I built the prototype architecture, program/app/workspace structure, relayer flow, client adapters, and devnet validation posture.

## Tech stack

- Protocol: Solana, Anchor, Rust
- App: Next.js, TypeScript
- Services: TypeScript relayer and Solana Actions API
- Testing: Anchor/TypeScript protocol tests
- Tooling: workspace builds, local/devnet scripts, GitHub Actions

## Architecture

```text
Merchant app/dashboard -> Next.js app -> client adapters
Customer action/link   -> Solana Actions API
Sponsored transaction  -> relayer -> Solana devnet program
Protocol state         -> Anchor accounts and instruction tests
```

## Key features

- Merchant/customer referral and loyalty flow
- Anchor program for protocol rules
- Relayer for transaction sponsorship
- Solana Actions service
- POS/web client adapter packages
- Devnet and local validation workflow

## Hard technical problems

- Coordinating app, relayer, Actions API, clients, and program state
- Keeping prototype scope clear for a finance-adjacent project
- Testing program behavior without implying audit-level confidence

## Important decisions and tradeoffs

- The project is devnet/prototype only.
- Mainnet use requires audit, monitoring, production wallet operations, and stronger tests.
- The relayer is a constrained sponsor, not a general custody service.
- Financial hype is intentionally avoided.

## Testing and validation

The project uses workspace builds, `cargo check`, Anchor build, and TypeScript protocol tests. Local validator tests and external audit work remain required before any mainnet use.

## Security and limitations

This repo is not audited for mainnet funds. Do not use it with real funds. Program IDs, wallet operations, monitoring, and incident response require production hardening.

## What I learned

- Solana/Anchor program structure
- Relayer and app coordination
- Protocol testing workflow
- Security communication for Web3 prototypes

## What I would improve with more time

- More local-validator instruction tests
- Better architecture diagrams and screenshots
- External security review
- Better pilot observability and failure handling

## What this project proves to employers

Viral Sync proves I can work across a web3 product stack, integrate protocol and web services, and communicate prototype/security boundaries honestly.

## Resume bullets

- Built a Solana devnet referral and loyalty protocol prototype with an Anchor program, Next.js app, relayer service, Actions API, and TypeScript client packages.
- Implemented local/devnet verification workflows using Anchor, TypeScript tests, workspace builds, and explicit mainnet safety warnings.
- Documented merchant/customer flows, relayer assumptions, protocol limitations, and audit requirements before any mainnet use.

