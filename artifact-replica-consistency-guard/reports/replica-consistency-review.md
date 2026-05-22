# Artifact Replica Consistency Guard: dataset-cellatlas-v4

Artifact type: dataset
Decision: hold-artifact
Generated: 2026-05-22T18:00:00Z
Replicas: 3

## Visible Actions
- None

## Gated Actions
- enable-preview
- enable-export
- enable-reproduce

## Findings
- replica-checksum-mismatch: cold-archive - cold-archive checksum sha256:archive-222 does not match canonical sha256:canonical-111.
- manifest-version-mismatch: cold-archive - cold-archive manifest version 4.1.0 does not match canonical 4.2.0.
- access-policy-mismatch: institutional-mirror - institutional-mirror access policy public does not match canonical controlled.
- replica-verification-stale: institutional-mirror - institutional-mirror was last verified 288 hours ago, above the 168-hour freshness threshold.
- landing-page-datacite-mismatch: landing-page - Landing page DataCite DOI 10.1234/cellatlas.v3 does not match canonical DOI 10.1234/cellatlas.v4.
- landing-page-access-policy-mismatch: landing-page - Landing page access policy public does not match canonical policy controlled.

## Repair Plan
- repair-checksum: cold-archive - Reconcile cold-archive checksum against canonical manifest before exposing durable artifact actions.
- repair-manifestVersion: cold-archive - Reconcile cold-archive manifest version against canonical manifest before exposing durable artifact actions.
- repair-accessPolicy: institutional-mirror - Reconcile institutional-mirror access policy against canonical manifest before exposing durable artifact actions.
- refresh-replica-verification: institutional-mirror - Refresh checksum and manifest verification for institutional-mirror before export or reproduce actions continue.
- repair-landing-page-datacite: landing-page - Update landing page DataCite metadata before persistent links or exports are enabled.
- repair-landing-page-access-policy: landing-page - Align landing page access policy with canonical storage policy before public previews are trusted.

---
# Artifact Replica Consistency Guard: notebook-rerun-pack

Artifact type: notebook
Decision: repair-review
Generated: 2026-05-22T18:10:00Z
Replicas: 2

## Visible Actions
- enable-preview

## Gated Actions
- enable-export

## Findings
- replica-verification-stale: public-mirror - public-mirror was last verified 73 hours ago, above the 48-hour freshness threshold.

## Repair Plan
- refresh-replica-verification: public-mirror - Refresh checksum and manifest verification for public-mirror before export or reproduce actions continue.

---
# Artifact Replica Consistency Guard: model-weight-capsule

Artifact type: model
Decision: publish-artifact
Generated: 2026-05-22T18:20:00Z
Replicas: 3

## Visible Actions
- enable-preview
- enable-export
- enable-reproduce

## Gated Actions
- None

## Findings
- None

## Repair Plan
- No repair action required
