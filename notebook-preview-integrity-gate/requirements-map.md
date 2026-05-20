# Requirements Map

Issue #14 asks for a Scientific Data and Code Hosting layer that can store, preview, version, and publish research artifacts with structured metadata and reproducibility support.

| Requirement area | Implementation coverage |
| --- | --- |
| Metadata-aware previews | previewManifest summarizes notebook cells, outputs, MIME types, preview modes, visual output state, and flags. |
| Notebook rendering readiness | unsafe-preview-content, inline-output-budget, execution-order-coherence, and visual-alt-text checks decide whether a notebook is ready, needs review, or is blocked. |
| Dataset and code artifacts | artifact-preview-readiness checks checksum, MIME type, license, size budget, and generated preview state for attached artifacts. |
| FAIR principles | fairScore grades findable, accessible, interoperable, and reusable readiness from metadata, artifacts, and execution environment capture. |
| DataCite metadata | dataciteDraft returns identifier, creators, title, publisher, publication year, resource type, rights, and subjects. |
| schema.org markup | schemaOrgDataset emits a JSON-safe Dataset object with distributions and checksums. |
| Reproducibility support | execution-environment-capture requires kernel, language, runtime or container, dependency lock, pinned dependencies, and seed policy. |
| Moderation workflow | reviewerPacket and renderDashboardSvg create human-readable review evidence for admins before preview publication. |
| Auditability | digest is stable across generated timestamps and can be stored in future audit logs or release records. |

## Acceptance checks

    node notebook-preview-integrity-gate/test.js
    node notebook-preview-integrity-gate/demo.js
