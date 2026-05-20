# Sensitive File Redaction Release Gate

Context: Scientific Data & Code Hosting
Status: needs-review

## Held Items
- artifact-b: personal data detected, missing redaction log
- artifact-c: secret pattern detected, raw credential detected, missing redaction log, export not allowed

## Reviewer Actions
- artifact-b: Apply de-identification or access controls.
- artifact-b: Attach redaction evidence before publication.
- artifact-c: Remove secrets and rotate affected credentials before release.
- artifact-c: Delete credential-bearing artifact and regenerate sanitized file.
- artifact-c: Attach redaction evidence before publication.
- artifact-c: Hold artifact until export policy allows release.

