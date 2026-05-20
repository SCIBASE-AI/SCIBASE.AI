# Notebook Preview Integrity Packet

Project: Unvetted Oncology Biomarker Notebook
Decision: blocked
Preview score: 7/100
FAIR score: 61/100
Digest: 148e30700c48295458d1f18eb28686caa666bbfff9e8c7096e1dc3b875739fb4

## Findings

- unsafe-preview-content (critical): 1 cell(s) need redaction before public preview.
- inline-output-budget (medium): 1 output(s) should be externalized before rendering.
- execution-order-coherence (medium): Execution counts are missing, duplicated, or out of order.
- visual-alt-text (low): 2 visual output(s) need alt text before publication.
- fair-metadata (high): Missing metadata: doi, license, keywords, resourceType, schemaOrgType.
- artifact-preview-readiness (medium): 1 artifact readiness issue(s) detected.
- execution-environment-capture (medium): Execution environment gaps: dependency-lock, seed-policy, pinned-dependencies.

## Remediation

- unsafe-preview-content: Redact credentials, tokens, private keys, and active HTML before publishing the preview.
- inline-output-budget: Externalize heavy outputs to artifact storage and reference them from the preview manifest.
- execution-order-coherence: Re-run the notebook from a clean kernel so execution counts are complete and monotonic.
- visual-alt-text: Add alt text or figure descriptions for every visual output.
- fair-metadata: Complete DOI, author, license, keyword, access, resource type, and schema.org metadata.
- artifact-preview-readiness: Add checksums, MIME types, licenses, and generated previews for every artifact.
- execution-environment-capture: Capture kernel, language, runtime or container image, lockfile digest, and seed policy.

## Preview Manifest

- Cell 1: code, rich-preview, 91 B output, flags: possible-secret, active-html, missing-alt-text
- Cell 2: code, external-reference, 700.0 KB output, flags: oversized-output, missing-alt-text
- Cell 3: markdown, inline-text, 0 B output, flags: none