# Frontier Demo Script Draft

Target length: 90-120 seconds.

```text
Blockchains are excellent at proving transactions. Viral Sync is built for the harder local commerce problem: proving causality.

If Alice tells Bob about a cafe and Bob actually walks in, who can prove Alice caused that visit? Today, almost nobody can. Viral Sync introduces Causal Receipts on Solana: privacy-preserving proof that a referral caused a real merchant-confirmed visit.

Here, Thamel Brew House creates a Growth Bounty. Alice opens her passbook and creates a Causal Invite. It is not just a URL; the invite includes the campaign, merchant, referrer commitment, nonce, expiry, and signature.

Bob claims the invite. The system derives a campaign nullifier so Bob cannot claim the same campaign twice, without exposing Bob's identity publicly.

Now Bob reaches the counter. The staff terminal creates a one-time visit challenge. Bob's device signs it, and the staff terminal signs it too. That gives us a Dual-Attested Visit.

After confirmation, Viral Sync records receipt metadata: the invite hash, nullifier hash, attestation hash, receipt PDA reference, and transaction reference. The public receipt explorer shows the campaign, merchant, attestation state, settlement state, and causal path.

The graph makes the invention visible: Alice caused Bob's verified visit. The fraud demo shows what gets rejected: expired challenges, consumed challenges, and duplicate nullifiers.

This is not pay per click. This is pay per verified visit. Viral Sync turns offline word-of-mouth into programmable settlement infrastructure for local commerce on Solana.
```
