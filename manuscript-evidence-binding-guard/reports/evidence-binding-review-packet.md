# Manuscript Evidence Binding Review Packet

Status: hold
Audit digest: 8b6eee3d8d77afc6eaa27f3b

## Summary

- Claims reviewed: 3
- Claims held: 2
- Assets reviewed: 3
- Assets held: 1
- Evidence anchors reviewed: 5
- Current evidence anchors: 4
- Critical findings: 7
- High findings: 6

## Reviewer Actions

- CRITICAL evidence_digest_drift: Rerun review on the current output digest before submission export. Targets: claim-air-quality-control, table-sensitivity
- CRITICAL upstream_source_digest_drift: Refresh the bound notebook output and evidence approval packet. Targets: claim-air-quality-control, table-sensitivity
- CRITICAL evidence_marked_stale: Regenerate the evidence and update the manuscript binding before export. Targets: claim-air-quality-control, table-sensitivity
- HIGH section_not_locked: Lock the section or remove the claim from the submission freeze. Targets: claim-causal-language
- CRITICAL required_evidence_type_missing: Bind the claim to the required evidence type before submission export. Targets: claim-causal-language
- HIGH citation_binding_missing: Bind a DOI or citation key to the evidence packet for reviewer traceability. Targets: claim-causal-language
- HIGH evidence_not_locked: Lock the evidence anchor or remove it from the publication-ready release. Targets: claim-causal-language
- HIGH evidence_not_approved: Approve the evidence packet after rerunning the linked analysis. Targets: claim-causal-language
- HIGH section_version_mismatch: Rebind the evidence to the current section hash or restore the approved section. Targets: claim-causal-language
- HIGH citation_metadata_missing: Add a DOI or stable citation key before the claim is exportable. Targets: claim-causal-language

## Held Claims And Assets

### claim-air-quality-control

- CRITICAL evidence_digest_drift: Evidence output changed after it was approved.
  Action: Rerun review on the current output digest before submission export.
- CRITICAL upstream_source_digest_drift: A dataset, code, or notebook dependency changed after evidence approval.
  Action: Refresh the bound notebook output and evidence approval packet.
- CRITICAL evidence_marked_stale: Evidence anchor is explicitly stale relative to the release freeze.
  Action: Regenerate the evidence and update the manuscript binding before export.

### claim-causal-language

- HIGH section_not_locked: Publication-ready claim lives in an unlocked section.
  Action: Lock the section or remove the claim from the submission freeze.
- CRITICAL required_evidence_type_missing: Claim is missing required dataset evidence.
  Action: Bind the claim to the required evidence type before submission export.
- HIGH citation_binding_missing: Claim has no citation key bound to the supporting evidence.
  Action: Bind a DOI or citation key to the evidence packet for reviewer traceability.
- HIGH evidence_not_locked: Evidence anchor is not locked for submission release.
  Action: Lock the evidence anchor or remove it from the publication-ready release.
- HIGH evidence_not_approved: Evidence anchor has not been approved for the current release.
  Action: Approve the evidence packet after rerunning the linked analysis.
- HIGH section_version_mismatch: Evidence is bound to a different section version than the release candidate.
  Action: Rebind the evidence to the current section hash or restore the approved section.
- HIGH citation_metadata_missing: Evidence anchor lacks DOI and citation metadata.
  Action: Add a DOI or stable citation key before the claim is exportable.

### table-sensitivity

- CRITICAL evidence_digest_drift: Evidence output changed after it was approved.
  Action: Rerun review on the current output digest before submission export.
- CRITICAL upstream_source_digest_drift: A dataset, code, or notebook dependency changed after evidence approval.
  Action: Refresh the bound notebook output and evidence approval packet.
- CRITICAL evidence_marked_stale: Evidence anchor is explicitly stale relative to the release freeze.
  Action: Regenerate the evidence and update the manuscript binding before export.
