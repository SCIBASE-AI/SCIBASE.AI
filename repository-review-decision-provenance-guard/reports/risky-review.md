# Repository Review-Decision Provenance Guard

Packet: packet-risky-review-decisions
Release candidate: v2.2-public-export
Status: HOLD
Fingerprint: ecea7282a32c0a38

## Summary

Hold release/export: 7 critical or high decision-provenance blocker(s) need remediation before reviewer decisions are durable and public-safe.

## Coverage

- Components requiring decision evidence: manuscript, data, code, notebook, metadata
- Covered components: notebook
- Missing components: manuscript, data, code, metadata

## Decision Records

- T-private-note: data deferred by data-steward
  - Anchor: data/patient-observations.csv @ feedbee
  - Export state: included
- T-code-open: code unspecified by maintainer
  - Anchor: code/analysis.py @ feedbee
  - Export state: missing
- T-notebook-role: notebook accepted by viewer
  - Anchor: notebooks/replay.ipynb @ null
  - Export state: included
- T-metadata-missing-export: metadata changed by metadata-curator
  - Anchor: metadata.json @ feedbee
  - Export state: missing

## Findings

- CRITICAL PRIVATE_REVIEW_NOTE_EXPORTED: T-private-note contains a private reviewer note without export redaction.
  - Evidence: Repository exports must not leak private reviewer notes, blind-review details, or hidden institutional comments.
  - Remediation: Redact private notes and preserve only a public-safe reason code in the exported decision record.
- HIGH RESOLUTION_RATIONALE_TOO_THIN: T-notebook-role has no durable resolution rationale.
  - Evidence: A resolved scientific review thread needs enough rationale for future auditors and citation readers.
  - Remediation: Record the accepted change, scientific reasoning, or deferral basis in the resolution rationale.
- HIGH RESOLVED_DECISION_NOT_EXPORTED: T-metadata-missing-export is resolved but not marked for export.
  - Evidence: Resolved scientific review decisions should be carried into release/export evidence instead of disappearing after merge.
  - Remediation: Set exported=true and include the record in the reviewDecisionPacket manifest entry.
- HIGH REVIEW_DECISION_PACKET_NOT_LINKED: The export manifest does not link the review-decision provenance packet.
  - Evidence: Resolved scientific review decisions must be carried with the release/export evidence.
  - Remediation: Add a reviewDecisionPacket entry with packet hash, record count, and covered components.
- HIGH REVIEWER_ROLE_NOT_ELIGIBLE_FOR_COMPONENT: T-notebook-role uses reviewer role viewer for notebook.
  - Evidence: Allowed reviewer roles for notebook: reproducibility-reviewer, methods-reviewer.
  - Remediation: Add an eligible reviewer decision or document an escalation override in the decision record.
- HIGH THREAD_ANCHOR_INCOMPLETE: T-notebook-role is missing file path or commit anchoring.
  - Evidence: Decision records cannot prove which repository content was reviewed without path and commit anchors.
  - Remediation: Attach anchor.path and anchor.commit for the reviewed file or notebook output.
- HIGH THREAD_NOT_RESOLVED_FOR_EXPORT: T-code-open is not resolved but is present in the release decision packet.
  - Evidence: This guard archives resolved decision provenance; open discussions should be routed back to merge review.
  - Remediation: Resolve the discussion with a rationale or remove it from the release decision packet until review is complete.
- WARNING DECISION_EVIDENCE_REFS_MISSING: T-code-open has no linked evidence references.
  - Evidence: Decision records should link tests, rendered outputs, reviewer screenshots, or manifest entries.
  - Remediation: Attach evidenceRefs for tests, outputs, exported artifacts, or reviewer attachments.
- WARNING DECISION_EVIDENCE_REFS_MISSING: T-notebook-role has no linked evidence references.
  - Evidence: Decision records should link tests, rendered outputs, reviewer screenshots, or manifest entries.
  - Remediation: Attach evidenceRefs for tests, outputs, exported artifacts, or reviewer attachments.

## Manifest Patch

```json
{
  "reviewDecisionPacket": {
    "packetId": "packet-risky-review-decisions",
    "packetHash": "aceced7e057804cb8815b37798951f94595973bc5a5af72ac5aedf10b70afcb5",
    "releaseTag": "v2.2-public-export",
    "decisionRecordCount": 1,
    "coveredComponents": [
      "notebook"
    ],
    "findingCount": 9
  }
}
```
