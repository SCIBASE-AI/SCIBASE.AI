# Submission Security Review

Generated: 2026-05-28T00:00:00.000Z

## Summary

- Submissions reviewed: 4
- Clear for review: 1
- Sanitize before review: 0
- Quarantined: 1
- Held for sponsor review: 2
- Average security score: 43

## Requirement Map

- Submission engine: screens solver packages before reviewer or sponsor access.
- Secure project space: prevents workspace escape, host mounts, and unsafe execution requests.
- Arbitration readiness: emits deterministic hold, quarantine, sanitize, or release actions.
- Audit logs: preserves reviewer-facing issue codes and remediation steps without executing submitted code.

## Decisions

### sub-clean-model

- Decision: clear-for-review
- Security score: 100
- Issues: 0
- Action: Release package to the reviewer sandbox with network disabled.

### sub-network-notebook

- Decision: hold-sponsor-review
- Security score: 0
- Issues: 6
- Action: Block executable artifact bin/postprocess.sh before sponsor or reviewer access.
- Action: Run analysis.ipynb:cell-1 in a no-network sandbox or require offline fixture replacement.
- Action: Disable shell execution in analysis.ipynb:cell-2.
- Action: Run analysis.ipynb:cell-2 in a no-network sandbox or require offline fixture replacement.
- Action: Remove API_TOKEN from the review packet and rotate if it was real.
- Action: Force container network mode to none unless the sponsor grants a documented waiver.

### sub-dependency-hook

- Decision: quarantine-submission
- Security score: 70
- Issues: 1
- Action: Strip or sandbox npm postinstall before reviewer installation.

### sub-escape-and-privileged-container

- Decision: hold-sponsor-review
- Security score: 0
- Issues: 6
- Action: Quarantine ../outside-workspace.csv and require a normalized manifest path.
- Action: Convert or strip macros from report.docm before release.
- Action: Remove AWS_SECRET_ACCESS_KEY from the review packet and rotate if it was real.
- Action: Reject privileged container mode for reviewer execution.
- Action: Remove host mounts before sandbox review.
- Action: Force container network mode to none unless the sponsor grants a documented waiver.
