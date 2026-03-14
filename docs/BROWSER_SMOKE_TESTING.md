# Browser Smoke Testing

Use the browser smoke stack when you want a real app/runtime flow without extension wallets or live RPC dependencies.

## Command

Run:

```bash
npm run smoke:browser-stack
```

This starts:

- a mock Solana RPC
- the action server
- the relayer
- the built Next.js app

## Test Harness

The app exposes browser-safe test hooks only when `NEXT_PUBLIC_ENABLE_BROWSER_TEST_MODE=true`:

- `Test Merchant Wallet`
- `Test Consumer Wallet`
- deterministic geo coordinates from `NEXT_PUBLIC_TEST_GEO_COORDS`

The smoke stack script configures those automatically.

## Suggested Flow

1. Open `/login`.
2. Choose `For Businesses`.
3. In the login modal, choose `Test Merchant Wallet`.
4. Open `/pos`.
5. Create a code and copy it.
6. Open `/login?switch=1`.
7. Choose `For Customers`.
8. In the login modal, choose `Test Consumer Wallet`.
9. Open `/consumer/scan`.
10. Paste the code and submit.

## Stable Selectors

The app now includes these browser automation selectors:

- `login-role-merchant`
- `login-role-consumer`
- `login-modal`
- `wallet-option-test-merchant`
- `wallet-option-test-consumer`
- `pos-amount-input`
- `pos-create-code-button`
- `pos-active-code`
- `scan-code-input`
- `scan-start-button`
- `scan-signature-link`

## Automated Browser Smoke

Run:

```bash
npm run smoke:browser
```

This command:

1. boots the full smoke stack
2. opens Chromium headlessly
3. logs in with the test merchant wallet
4. creates a POS code
5. switches to the test consumer wallet
6. redeems the code

Artifacts are written to `output/playwright/`.

## CI Gate

GitHub Actions now includes `.github/workflows/runtime-quality.yml`, which runs:

1. `npm run test:anchor`
2. `npm run build --workspace server/actions`
3. `npm run build --workspace relayer`
4. `npm run lint --workspace app`
5. `npm run build --workspace app`
6. `npm run smoke:browser`

The workflow uploads `output/playwright/` as an artifact so browser failures are inspectable from CI.

## One-Shot Verification

To verify that the whole stack boots and wires correctly without keeping processes alive:

```bash
VIRAL_SYNC_SMOKE_ONCE=true npm run smoke:browser-stack
```

PowerShell:

```powershell
$env:VIRAL_SYNC_SMOKE_ONCE='true'
npm run smoke:browser-stack
```
