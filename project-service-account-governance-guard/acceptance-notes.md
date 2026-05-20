# Acceptance Notes

## Issue #11 Fit

The guard targets project-scoped automation accounts inside User & Project Management. It gives maintainers a deterministic way to decide whether bot/API-token access should remain active when owners, sponsors, identity assurance, scopes, integrations, or token lifecycle evidence changes.

## Reviewer Value

- Prevents orphaned project automation from surviving owner departure.
- Blocks high-risk scopes on bot accounts before they become project owner, billing, secret, or restricted-data paths.
- Separates low-risk rotation work from hard access holds.
- Produces a JSON report, Markdown packet, SVG summary, MP4 preview, and stable audit digest for project access logs.

## Local Validation

- `node project-service-account-governance-guard/test.js`
- `node project-service-account-governance-guard/demo.js`
- `node --check project-service-account-governance-guard/index.js`
- `node --check project-service-account-governance-guard/sample-data.js`
- `node --check project-service-account-governance-guard/test.js`
- `node --check project-service-account-governance-guard/demo.js`
- `git diff --check`
