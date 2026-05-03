# Frontier Submission Packet

Generated: 2026-05-01T08:52:19.266Z

## One-Sentence Pitch

Viral Sync is the Causal Receipt protocol for Solana: merchants fund rewards, customers share signed invites, staff confirm real visits, and the resulting proof can be verified and composed by anyone.

## Winning Proof Path

1. Merchant registers a Causal Commerce config.
2. Merchant creates and funds a Growth Bounty.
3. The program records a Causal Receipt with a campaign-scoped nullifier.
4. The program settles exactly once from the SPL reward vault.
5. The merchant closes the bounty, reclaims unused funds, and closes the vault account.
6. The verifier independently checks receipt, settlement, nullifier, token balances, and replay rejection.

## Localnet Evidence

| Field | Value |
|---|---|
| Program | `AeKT1B58Qi9rBtrtnMe11o4eXbVwHweKxGFNS5X3Vv46` |
| RPC | `http://127.0.0.1:8899` |
| Wallet | `26vEG5wHiweSfKQqckL3NgzdZmCGwNk5gCjHfNw4PAkW` |
| Campaign | `2qhWQSjpzYhfAceG7v756icEa6Joc2nvJDFn9Bf8ywGa` |
| Reward escrow | `G1bZTFUUNfGSK2YGqxkyzZYSKf9qoxjW9zmMp52KFPsK` |
| Reward vault | `ACKQRpSpKwzmjZ5yJ53NSzYvmd96sAXVnhXMgM7zG2Ju` |
| Causal receipt | `2hXb31kS1Tjt5MJE44gq3VKsQSnzGVEC4bD3m1VPhx97` |
| Settlement record | `Dxcx4ByDwE2D9FNiFjx8KfrWaA4S6TTaizB8TckCFCcV` |
| Verifier | PASS |
| Replay checks | PASS |

## SPL Custody Ledger

| Account | Before | After settlement | After close |
|---|---:|---:|---:|
| Merchant reward account | `10000` | `0` | `9000` |
| Reward vault | `0` | `9000` | `closed` |
| Referrer reward account | `0` | `800` | `800` |
| Visitor reward account | `0` | `200` | `200` |

## Commands For Judges

```bash
npm ci
npm run verify
npm run build:program
npm run localnet:smoke
npm run localnet:proof-graph
npm run localnet:evidence-report
npm run frontier:submission
```

## Hosted App Relayer Surface

- Policy: `GET /api/launch/relayer/policy`
- Causal Commerce intent builder: `GET|POST /api/launch/relayer/causal-commerce`
- Sponsored transaction simulator: `POST /api/launch/relayer/sponsor`

## Judge Assets

- `docs/winner-scope.md`
- `docs/golden-demo-path.md`
- `docs/localnet-proof-graph.md`
- `docs/localnet-evidence-report.md`
- `docs/week-40-52-completion.md`
- `docs/frontier-final-go-no-go.md`

## Honest Limitations

localnet proves SPL Token custody, payout, vault reclaim, and vault account close; production mainnet still requires external audit and funded relayer operations.
