# Scientific Bounty Review Integrity

This module adds a dependency-free integrity layer for the Scientific Bounty System in issue #18. It focuses on the review, arbitration, payout-readiness, and IP handoff parts of a scientific challenge workflow.

## What It Covers

- Evidence manifests with deterministic SHA-256 hashes for submitted artifacts.
- Required deliverable checks for whitepapers, datasets, notebooks, or any challenge-defined artifact type.
- Reviewer conflict detection by team, affiliation, and declared conflict list.
- Weighted rubric scoring with passing-threshold evaluation.
- Milestone payout planning split across contributor shares.
- IP transfer state that keeps solver IP retained until payout is ready.
- Audit hash for sponsor/reviewer traceability.

## Run The Demo

```bash
node scientific-bounty-review-integrity/demo.js
```

The demo prints a reviewer-ready JSON decision record containing evidence hashes, conflict review IDs, scoring, payout readiness, payout splits, and the final audit hash.

## Visual Demo

Open `scientific-bounty-review-integrity/docs/demo.svg` for a privacy-safe walkthrough of the module flow. It uses only synthetic sample data and shows how a submission moves from evidence hashing through reviewer conflict checks, rubric scoring, payout readiness, and IP handoff.

For bounty review, the same walkthrough is also available as a short WebM demo video at `scientific-bounty-review-integrity/docs/demo.webm`.

## Run The Tests

```bash
node scientific-bounty-review-integrity/test.js
```

The tests cover a passing submission, a missing-deliverable blocker, conflicted reviewer exclusion, deterministic hashing, and milestone payout splitting.

## Requirement Mapping

| Issue #18 requirement | Implementation |
| --- | --- |
| Submission package manifest | `buildEvidenceManifest()` hashes and records artifact metadata. |
| Arbitration and reviewer validation | `evaluateScientificBounty()` filters conflicted reviews before scoring. |
| Evaluation criteria and scoring rubric | Weighted rubric validation and score aggregation are enforced. |
| Milestone and prize payout routing | `buildMilestonePayouts()` creates contributor-level payment splits. |
| IP management options | `ipTransferState` is blocked until the submission is payout-ready. |
| Sponsor trust and reproducibility | `auditHash` creates a stable decision record for later verification. |

## Design Notes

The module intentionally uses only Node.js built-ins. It can be embedded into a future API, worker, or CLI without adding package-manager dependencies or credentials.
