# Requirements Map

Issue #18 asks for a Scientific Bounty System with challenge posting, submission, arbitration, and reward workflows. This PR adds a focused reviewer trust slice that fits between challenge setup and live scoring.

| Issue Capability | Guard Coverage |
| --- | --- |
| Evaluation criteria and scoring rubric | Requires declared rubric criteria and low/target/high normalization anchors. |
| Arbitration and reviewer trust | Excludes sponsor, solver, observer, inactive, unknown, and conflicted evaluator scores. |
| Submission evaluation dashboard | Emits challenge status, review queue, recalibration queue, and reviewer artifacts. |
| Multi-phase challenges | Provides a pre-live-scoring gate that can be run before each scoring phase. |
| Audit logs and reproducibility | Produces deterministic JSON packets and SHA-256 audit digest. |
| Short demo artifact | `npm run demo` generates Markdown, SVG, JSON, and MP4 outputs. |

## Non-Overlap Note

This is not another broad bounty marketplace, intake, arbitration, payout, appeal, data-room, benchmark leakage, or embargo-release implementation. The slice is specifically about calibration seed readiness before live sponsor/reviewer scoring begins.
