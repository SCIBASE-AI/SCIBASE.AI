# Repository Retention Legal Hold Gate Report

Repository: repo-climate-ice-core
Version: v2.1.0
Action: delete-export-bundle
Generated: 2026-05-22T12:00:00Z
Decision: blocked

## Coverage

Component count: 3
Archive coverage: 100%
Export bundles: 1
Active legal holds: 1

## Blockers

- Active legal hold hold-ethics-review prevents delete-export-bundle

## Required Actions

- preserve_legal_hold_scope: hold-ethics-review (ethics review pending)

---
# Repository Retention Legal Hold Gate Report

Repository: repo-open-assay
Version: v1.0.0
Action: publish-version
Generated: 2026-05-22T12:00:00Z
Decision: needs-remediation

## Coverage

Component count: 3
Archive coverage: 67%
Export bundles: 1
Active legal holds: 0

## Blockers

- data/assay.csv lacks archive evidence
- bundle-v1.0.0 lacks a manifest hash

## Required Actions

- archive_component: data/assay.csv (version release requires durable archive evidence)
- record_bundle_manifest_hash: bundle-v1.0.0 (export bundles need reproducible manifest integrity)

---
# Repository Retention Legal Hold Gate Report

Repository: repo-compliant-release
Version: v3.0.0
Action: publish-version
Generated: 2026-05-22T12:00:00Z
Decision: approved

## Coverage

Component count: 4
Archive coverage: 100%
Export bundles: 1
Active legal holds: 0

## Blockers

- None

## Required Actions

- None
