# Anonymous Review Packet Guard

Challenge: Anonymous Biomarker Discovery Challenge
Submission: submission-anon-biomarker-042
Decision: hold-review-packet
Risk score: 100/100
Evidence digest: 2f3128eec95e4284

## Scope

Artifacts: 4
Commits: 2
Access grants: 2
Redaction receipts: 1
Audit logs: 2

## Findings

### 1. FILE_PATH_IDENTITY_LEAK (high)
Artifact notebook-main path contains identity-bearing text.

Recommendation: Replace local usernames, lab folders, and institution paths with neutral artifact paths.

Evidence:
```json
{
  "artifactId": "notebook-main",
  "path": "/Users/alice-nguyen/stanford-lab/bounty/submission/main.ipynb",
  "detectedSignals": [
    "home-directory",
    "institution"
  ]
}
```

### 2. DOCUMENT_METADATA_LEAK (high)
Artifact notebook-main metadata can identify the solver team.

Recommendation: Strip document author, company, editor, and template metadata from review exports.

Evidence:
```json
{
  "artifactId": "notebook-main",
  "metadata": {
    "author": "Alice Nguyen",
    "kernelspec": "python3",
    "lastModifiedBy": "alice.nguyen@stanford.edu"
  },
  "detectedSignals": [
    "email",
    "institution",
    "github-handle"
  ]
}
```

### 3. NOTEBOOK_OUTPUT_IDENTITY_LEAK (high)
Notebook notebook-main output contains solver identity signals.

Recommendation: Clear notebook outputs or redact user, host, and local path fragments before reviewer access.

Evidence:
```json
{
  "artifactId": "notebook-main",
  "outputHits": [
    {
      "index": 0,
      "signals": [
        "home-directory"
      ],
      "value": "Loaded cohort from /Users/alice-nguyen/private/cohort.csv"
    }
  ]
}
```

### 4. DOCUMENT_METADATA_LEAK (high)
Artifact manuscript-pdf metadata can identify the solver team.

Recommendation: Strip document author, company, editor, and template metadata from review exports.

Evidence:
```json
{
  "artifactId": "manuscript-pdf",
  "metadata": {
    "author": "A. Nguyen",
    "company": "Stanford University",
    "template": "lab-letterhead-v4"
  },
  "detectedSignals": [
    "institution"
  ]
}
```

### 5. EXIF_GPS_OR_DEVICE_LEAK (medium)
Media artifact figure-workflow contains identifying EXIF metadata.

Recommendation: Remove EXIF GPS, serial, device owner, and capture metadata from figures and media.

Evidence:
```json
{
  "artifactId": "figure-workflow",
  "exif": {
    "gps": "37.4275,-122.1697",
    "deviceOwner": "Alice Nguyen",
    "serialNumber": "IMG-ALICE-9981"
  }
}
```

### 6. COMMIT_AUTHOR_LEAK (high)
Commit a1b2c3d exposes solver identity metadata.

Recommendation: Rewrite or mask commit author metadata before the sponsor review packet is released.

Evidence:
```json
{
  "sha": "a1b2c3d",
  "authorName": "Alice Nguyen",
  "authorEmail": "alice.nguyen@stanford.edu",
  "detectedSignals": [
    "email",
    "institution",
    "github-handle"
  ]
}
```

### 7. ACKNOWLEDGEMENT_IDENTITY_LEAK (medium)
Review packet section acknowledgements can identify the solver team.

Recommendation: Move acknowledgements and institution references to the post-award disclosure packet.

Evidence:
```json
{
  "sectionId": "acknowledgements",
  "kind": "acknowledgements",
  "redacted": false,
  "detectedSignals": [
    "institution",
    "github-handle"
  ]
}
```

### 8. UNBLINDED_REVIEWER_ROLE (high)
Access grant grant-sponsor-review exposes an unredacted packet to sponsor.

Recommendation: Remove sponsor/reviewer access until all anonymous review roles use the redacted packet.

Evidence:
```json
{
  "grantId": "grant-sponsor-review",
  "role": "sponsor",
  "principal": "pharma-sponsor",
  "packetVariant": "unredacted"
}
```

### 9. REDACTION_EVIDENCE_MISSING (medium)
Artifact notebook-main requires redaction but has no receipt.

Recommendation: Attach redaction receipts for every transformed artifact before review release.

Evidence:
```json
{
  "artifactId": "notebook-main",
  "requiredReason": "local username and lab path in notebook metadata"
}
```

### 10. REDACTION_EVIDENCE_MISSING (medium)
Artifact manuscript-pdf requires redaction but has no receipt.

Recommendation: Attach redaction receipts for every transformed artifact before review release.

Evidence:
```json
{
  "artifactId": "manuscript-pdf",
  "requiredReason": "office metadata contains company field"
}
```

### 11. REDACTION_EVIDENCE_MISSING (medium)
Artifact figure-workflow requires redaction but has no receipt.

Recommendation: Attach redaction receipts for every transformed artifact before review release.

Evidence:
```json
{
  "artifactId": "figure-workflow",
  "requiredReason": "EXIF GPS/device owner present"
}
```

### 12. AUDIT_LOG_UNPROTECTED (medium)
Audit log identity-map contains identity data outside arbitrator-only visibility.

Recommendation: Keep full identity audit logs restricted to arbitrators until award or dispute resolution.

Evidence:
```json
{
  "logId": "identity-map",
  "visibility": "reviewer-visible",
  "containsIdentity": true
}
```
