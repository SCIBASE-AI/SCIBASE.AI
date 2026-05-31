# Repository Branch Protection Drift Guard

This module is a focused Project Repository & Version Control slice for issue
#10. It audits whether protected scientific repository branches still enforce
the release controls needed before DOI, citation, or export-bundle actions.

It uses synthetic data only and has no external service dependencies.

## Checks

- Missing required status checks for reproducibility, citation metadata, and
  export manifest validation.
- Reduced review-count requirements on protected release branches.
- Signed-commit enforcement drift.
- Force-push or deletion settings enabled on protected branches.
- Admin bypass enabled without an active exception ticket.
- Export bundles targeting branches with unresolved protection drift.

## Local Verification

```bash
node repository-branch-protection-drift-guard/test.js
node repository-branch-protection-drift-guard/demo.js
```

Demo artifacts are written to
`repository-branch-protection-drift-guard/reports/`.

## Issue #10 Mapping

This complements repository version control, merge requests, release tagging,
reproducibility checks, citations, and export bundles without overlapping the
broader repository ledger, merge queue, component-owner approval, semantic tag,
external-reference pinning, notebook diff, fork provenance, release signature,
restore rehearsal, compute sandbox, retention/legal-hold, or embargo guards.
