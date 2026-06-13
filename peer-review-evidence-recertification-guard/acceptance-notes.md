# Acceptance Notes

The implemented slice is intentionally distinct from existing #15 submissions:

- It is not a broad reputation ledger.
- It is not COI, recusal, civility, workload, accessibility, rubric validation, edit history, badge renewal, or profile visibility work.
- It focuses on stale review evidence after artifact revisions and the recertification workflow needed before reputation updates are allowed.

Validation targets:

- stale dataset review freezes an 18 point reputation delta
- recertified code review keeps its 14 point reputation delta
- double-blind reviewer identity is not leaked in tasks or timeline events
- anonymous labels that contain direct identifiers are not echoed in tasks or timeline events
- space-separated blind and fully anonymous mode labels do not leak raw reviewer IDs
- public or semi-private reviews without reviewer identity are frozen for recertification instead of applying credit to an undefined profile
- malformed reputation-delta evidence is frozen for recertification instead of applying non-numeric profile credit
- recertification timestamps that predate the original review submission are frozen before profile credit is applied
- malformed top-level recertification packets create reviewer-visible holds instead of crashing before timeline evidence is generated
- malformed project snapshot timestamps create project-evidence recertification tasks and null audit generatedAt evidence before reputation updates are allowed
- malformed review and inline-comment entries inside otherwise valid evidence arrays create recertification holds instead of crashing or being silently ignored
- malformed non-array review and inline-comment collections create recertification holds instead of being treated like omitted evidence
- stale inline comment anchors generate comment-specific recertification tasks
- artifact digest changes mark inline comment anchors stale even when the selector line is unchanged
- artifact updates after inline comments require recertification even when digest and selector evidence still match
- missing or malformed inline comment timestamps require recertification before comment evidence is treated as current
- missing inline comment anchor metadata requires recertification instead of crashing evidence evaluation
- missing artifact anchor maps require comment recertification instead of crashing evidence evaluation
- omitted review, comment, or artifact collections in sparse project snapshots do not crash recertification evaluation
- stale inline-comment evidence blocks reputation updates even when no stale review is present
- missing or malformed artifact change timestamps require review and inline-comment recertification before reputation credit or comment evidence is applied
- timeline packets include deterministic audit digests
