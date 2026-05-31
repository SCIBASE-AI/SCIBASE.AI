# Requirements Map

## SCIBASE Issue #10: Project Repository & Version Control

- Repository/version control governance: evaluates repository automation credentials before release tags or protected branches can publish scientific artifacts.
- Audit logs and review evidence: emits deterministic JSON and Markdown reviewer packets plus an audit digest.
- Versioned scientific workspace integrity: blocks stale, wildcard, or overprivileged credentials that could mutate release branches, packages, or deployable artifacts outside approved controls.
- Collaboration and ownership readiness: checks owner attestation freshness and required rotation evidence before credentials remain active.
- Release safety: validates expiry windows, protected refs, environment-scoped permissions, and clean secret-scan status.

## Non-Goals

- No real credentials, live GitHub API calls, secret scanning of private repositories, payout data, or external services.
- No overlap with branch-protection, release-signature, Git LFS, artifact-prune, notebook-output, fork-provenance, retention-hold, or external-reference-pin guard submissions.
