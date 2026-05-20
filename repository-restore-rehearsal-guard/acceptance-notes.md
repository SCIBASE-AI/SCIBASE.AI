# Acceptance Notes

## Issue #10 Fit

The guard targets a version-control concern that is not covered by commit diffs alone: a release is only useful if its repository snapshot can be restored with the expected scientific artifacts, citations, and provenance intact.

## Reviewer Value

- Finds unrecoverable backups before release or archive promotion.
- Separates warning-level restore readiness issues from hard quarantine blockers.
- Verifies large-artifact availability and manifest hashes against the versioned repository record.
- Produces JSON, Markdown, SVG, MP4, and stable audit digests for release packets.

## Local Validation

- `node repository-restore-rehearsal-guard/test.js`
- `node repository-restore-rehearsal-guard/demo.js`
- `node --check repository-restore-rehearsal-guard/index.js`
- `node --check repository-restore-rehearsal-guard/sample-data.js`
- `node --check repository-restore-rehearsal-guard/test.js`
- `node --check repository-restore-rehearsal-guard/demo.js`
- `git diff --check`
