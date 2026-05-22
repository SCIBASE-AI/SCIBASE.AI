# Collaborative Embargo Release Guard

Release: `release-alpha-double-blind`
Channel: `journal-submission`
Status: `block`
Risk score: `710`
Fingerprint: `adfb1595a7cdcd07b85f57ca1bd3a7c66b13ef1f3d744080d278f835715e8ae5`

## Summary

- Checks: 12
- Blockers: 7
- Warnings: 1
- Passes: 4

## Checks

- **BLOCKER** `embargo-embargo-dataset-alpha-active`: Release package contains artifacts before their embargo window ends.
- **BLOCKER** `blind-review-identity-leak`: Blind-review release package exposes author or affiliation identity fields.
- **PASS** `artifact-figure-main-public`: Artifact is public-safe for this release package.
- **BLOCKER** `artifact-dataset-alpha-restricted`: Restricted artifact is included without a release-safe redaction treatment.
- **BLOCKER** `artifact-supplement-lab-notes-restricted`: Restricted artifact is included without a release-safe redaction treatment.
- **PASS** `thread-thread-editorial-ready-release-safe`: Exported collaboration thread is release-safe.
- **BLOCKER** `thread-thread-private-sponsor-private-export`: Release package exports a private collaboration thread.
- **WARNING** `presence-snapshots-exported`: Live presence snapshots are included; verify they are sanitized before external release.
- **PASS** `section-intro-approved`: Exported section matches the approved collaborative version.
- **BLOCKER** `section-methods-version-drift`: Exported section version differs from the approved collaborative version.
- **PASS** `section-results-approved`: Exported section matches the approved collaborative version.
- **BLOCKER** `release-clock-before-not-before`: Release is scheduled before the policy not-before timestamp.

## Actions

- `must_fix` managing_editor: Remove embargoed artifacts or move release time after the embargo end.
- `must_fix` collaboration_lead: Redact author and affiliation identity fields before external review export.
- `must_fix` data_steward: Replace restricted files with release-safe redacted digests.
- `must_fix` data_steward: Replace restricted files with release-safe redacted digests.
- `must_fix` collaboration_lead: Resolve or exclude private review threads before release.
- `review` collaboration_lead: Exclude live presence snapshots from external release packets.
- `must_fix` section_owner: Export the approved section version or re-approve the latest draft.
- `must_fix` managing_editor: Move the release time after the not-before gate or update the governing policy clock.
