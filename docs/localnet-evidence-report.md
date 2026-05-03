# Localnet Evidence Report

This is the judge-facing localnet evidence packet for the current Causal Commerce proof path.

## Verdict

- Verifier result: PASS
- Verifier failures: none
- Replay checks: PASS

## Inputs

| Field | Value |
|---|---|
| RPC | `http://127.0.0.1:8899` |
| Program | `AeKT1B58Qi9rBtrtnMe11o4eXbVwHweKxGFNS5X3Vv46` |
| Wallet | `26vEG5wHiweSfKQqckL3NgzdZmCGwNk5gCjHfNw4PAkW` |
| Wallet source | `ephemeral` |
| Org id | `viral-sync-localnet-org-molwn0j0` |
| Campaign id | `viral-sync-localnet-campaign-molwn0j0` |
| Receipt id | `viral-sync-localnet-receipt-molwn0j0` |
| Reward per visit | `1000` |
| Fund amount | `10000` |

## Proof Accounts

| Account | Address |
|---|---|
| Merchant config | `HUikXy5ioj5cyw3Z5HbLtixDcvYUfFyMCJ5SyasmNrBT` |
| Growth campaign | `2qhWQSjpzYhfAceG7v756icEa6Joc2nvJDFn9Bf8ywGa` |
| Merchant reward account | `AG4AsAJqLzTAH6XLa6aNswo7BiSMsaxbe9ufcyiy2tM2` |
| Reward escrow | `G1bZTFUUNfGSK2YGqxkyzZYSKf9qoxjW9zmMp52KFPsK` |
| Reward vault | `ACKQRpSpKwzmjZ5yJ53NSzYvmd96sAXVnhXMgM7zG2Ju` |
| Causal receipt | `2hXb31kS1Tjt5MJE44gq3VKsQSnzGVEC4bD3m1VPhx97` |
| Nullifier record | `FWCuqZTgn2KMJYtriGnLsLkjJmazpi19cyGjMiSTYk1Q` |
| Settlement record | `Dxcx4ByDwE2D9FNiFjx8KfrWaA4S6TTaizB8TckCFCcV` |

## Settlement

- Receipt status: `{"settled":{}}`
- Receipt reward amount: `1000`
- Receipt settled amount: `1000`
- Referrer amount: `800`
- Visitor amount: `200`

## SPL Token Custody

| Account | Before | After settlement | After close |
|---|---:|---:|---:|
| Merchant reward account | `10000` | `0` | `9000` |
| Reward vault | `0` | `9000` | `closed` |
| Referrer reward account | `0` | `800` | `800` |
| Visitor reward account | `0` | `200` | `200` |

Verifier token balances:

- Reward vault: `closed`
- Merchant reward account: `9000`
- Referrer reward account: `800`
- Visitor reward account: `200`

## Replay Results

- duplicate campaign nullifier: rejected (Simulation failed. )
- duplicate receipt settlement: rejected (Simulation failed. )

## Known Limit

localnet proves SPL Token custody, payout, vault reclaim, and vault account close; production mainnet still requires external audit and funded relayer operations.
