# Requirements Map

Issue #15 asks for structured peer review, contribution credit, profile history, transparent reputation scoring, leaderboards, and badge systems. This slice focuses on the structured peer-review template gate that protects downstream reputation from malformed review inputs.

| Issue requirement | Implementation coverage |
| --- | --- |
| Discipline-specific peer-review templates | `discipline` and template fixture scenarios model biology, physics, and social-science templates. |
| Optional scoring on clarity, rigor, novelty, reproducibility | Required rubric dimensions are enforced by `evaluatePeerReviewTemplateRubric`. |
| Inline comments on documents, datasets, code, and notebooks | `reviewedArtifactTypes` and `evidenceAnchors` require rubric dimensions to cite relevant artifacts before credit is computed. |
| Public, semi-private, anonymous, blind, and double-blind review modes | `visibilityMode` and `reviewMode` checks detect privacy gaps before profile or timeline publication. |
| Review history tracked on profiles and timelines | `publicationTargets` plus `profilePacket` ensure rubric versioning and anonymous identity redaction before publication. |
| Transparent reputation metrics | Findings and curator actions explain why a template is held, routed to review, or safe to publish. |
| Reviewer-ready demo | `demo.js` writes JSON, Markdown, SVG, and H.264 MP4 artifacts in `reports/`. |
| Safe local verification | `test.js` covers hold, curator review, and publish decisions without external calls or secrets. |

## Distinctness

This module avoids duplicating existing issue #15 slices by staying narrow: it does not implement a broad community ledger, endorsement ring guard, badge or leaderboard gate, review civility checker, timeliness module, recusal/COI guard, calibration bench, edit-history integrity guard, identity-leak-only guard, profile visibility guard, appeals queue, mentorship ledger, correction-impact ledger, or contributor credit attestation module. It validates review template structure before any downstream reputation logic runs.
