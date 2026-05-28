# Scientific Bounty Completion Reputation Guard

This self-contained guard reviews synthetic scientific bounty completion packets before outcomes affect researcher reputation, badges, leaderboards, citation pages, or public trust indicators.

It checks whether a completed challenge has enough sponsor, funding, attribution, and appeal evidence to safely update reputation.

The guard focuses on:

- sponsor acceptance evidence
- funded settlement status
- milestone and deliverable parity
- team split attribution
- duplicate/overlapping claim risk
- appeal and hold windows
- challenge difficulty normalization
- citation and badge visibility gates

All data is synthetic. The module performs no payment, wallet, bank, identity-provider, CRM, or external API calls.

## Run

```sh
node community-user-reputation-system/scientific-bounty-completion-reputation-guard/test.js
node community-user-reputation-system/scientific-bounty-completion-reputation-guard/demo.js
node community-user-reputation-system/scientific-bounty-completion-reputation-guard/make-demo-video.js
```

Generated reviewer artifacts are written to `reports/`.
