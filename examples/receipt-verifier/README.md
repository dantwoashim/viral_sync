# Viral Sync Receipt Verifier Example

This tiny example shows the intended composability surface: another app can verify a Causal Receipt and read the public graph without depending on the Viral Sync web app UI.

## Run

```bash
npm install
npm run verify -- --base-url http://localhost:3000 --receipt receipt-1
```

Use a receipt id from a published proof manifest or from the localnet smoke manifest.
