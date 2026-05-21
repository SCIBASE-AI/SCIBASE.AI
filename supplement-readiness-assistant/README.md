# Supplement Readiness Assistant

This module is a focused AI-Powered Research Assistant Suite slice for issue #16. It validates whether a manuscript supplement package is ready for reviewer and reproducibility use before submission.

The assistant checks:

- manuscript claims linked to the expected supplement artifacts
- dataset, code, notebook, and protocol manifest coverage
- checksum freshness and mismatch risk
- license and access metadata
- figure/table appendix support
- reproducibility rerun prerequisites
- privacy and restricted-data release blockers
- orphaned supplement files that reviewers cannot trace back to claims

It uses only Node.js built-ins and synthetic data.

## Run

```bash
node supplement-readiness-assistant/test.js
node supplement-readiness-assistant/demo.js
```

The demo writes reviewer artifacts to `supplement-readiness-assistant/reports/`.
