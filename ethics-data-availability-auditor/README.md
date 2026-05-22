# Ethics/Data Availability Auditor

Self-contained peer-review compliance slice for issue #13.

The module audits a manuscript packet for:

- explicit ethics approval and consent language
- data availability statements tied to recognized repositories or access terms
- code availability statements for reproducible analysis
- claim-level links to dataset and analysis-code artifacts
- private or internal datasets that lack a release or controlled-access route

It is deterministic, dependency-free, and uses synthetic fixtures only.

## Run

```sh
npm run check
npm test
npm run demo
```

Generated review artifacts are written to `reports/`.

## Bounty Scope

This focuses on the peer-review aid compliance requirement from #13. It does not implement the broad summarizer, citation recommendation engine, protocol deviation screener, figure/table auditor, novelty detector, or manuscript similarity checker.
