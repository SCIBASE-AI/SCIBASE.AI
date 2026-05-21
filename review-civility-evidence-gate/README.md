# Peer Review Civility And Evidence Gate

This module is a focused slice for issue #15, Community & User Reputation System. It protects the review and comment layer before content is published to project timelines or allowed to affect researcher reputation.

It is intentionally not another broad reputation ledger. The gate evaluates structured peer reviews and inline comments for:

- harassment or personal attacks
- protected or personal identity disclosures
- anonymous, blind, or double-blind reviewer identity leaks
- low structured scores that lack evidence anchors
- missing inline artifact anchors
- repeated comments that should be collapsed before reputation impact

The output is a deterministic moderation packet with blockers, warnings, redactions, withheld item IDs, and a release recommendation.

## Run

```bash
node review-civility-evidence-gate/test.js
node review-civility-evidence-gate/demo.js
```

The demo writes:

- `reports/civility-evidence-packet.json`
- `reports/civility-evidence-report.md`
- `reports/summary.svg`
- `reports/summary.png`
- `reports/demo.mp4`

## Design Notes

- Dependency-free Node.js implementation for the core logic.
- Synthetic data only. No credentials or external services.
- Evidence anchors support DOI, URLs, figure/table references, dataset IDs, commits, notebook cells, lines, protocols, sections, and artifacts.
- Reputation impact is withheld while blockers are present.
