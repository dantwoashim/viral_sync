# Launch State Machines

Day 40-50 formalizes core product states so retries, fraud checks, and manager overrides do not create ambiguous money state.

```mermaid
stateDiagram-v2
  [*] --> invite_active
  invite_active --> invite_claimed
  invite_active --> invite_expired
  invite_active --> invite_disabled
```

```mermaid
stateDiagram-v2
  [*] --> claim_created
  claim_created --> claim_blocked
  claim_created --> claim_redeemed
```

```mermaid
stateDiagram-v2
  [*] --> code_issued
  code_issued --> code_scanned
  code_issued --> code_expired
  code_issued --> code_voided
  code_scanned --> code_confirmed
  code_scanned --> code_voided
```

```mermaid
stateDiagram-v2
  [*] --> challenge_issued
  challenge_issued --> challenge_signed
  challenge_issued --> challenge_expired
  challenge_signed --> challenge_confirmed
  challenge_confirmed --> challenge_consumed
```

Operational rules:

- Confirmation is idempotent: repeated staff confirmation returns existing receipt/code state.
- Redeem codes are random and stored with a merchant/campaign-bound hash.
- Manual void requires a manager session and reason.
- Outbox jobs isolate side effects such as receipt indexing and notifications.
- Production deployments must use `LAUNCH_DATABASE_URL`; local JSON is development-only.
