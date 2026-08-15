# Research Materials Authentication Assistant

This module adds a focused research-materials authentication guard for the AI-Powered Research Assistant Suite in issue `#16`.

AI-assisted review can miss mundane but decisive reproducibility problems: an antibody without a traceable identifier, a stale validation panel, a contaminated cell line, a species mismatch, or a passage range that cannot be true. This assistant inspects synthetic manuscript review packets and returns release, review, or hold decisions with evidence-linked remediation.

## Scope

- Checks RRID-style identifiers for antibodies, cell lines, organism strains, primary cells, and reagents.
- Flags missing lot or batch metadata for lot-sensitive materials.
- Checks validation evidence freshness against a deterministic review date.
- Holds contaminated cell-derived materials.
- Checks reported passage ranges and reported passage numbers.
- Compares material species and claimed organism against linked assays.
- Holds antibody target mismatches when the antibody target does not match the measured assay target.
- Produces JSON, Markdown, SVG, and MP4 demo artifacts.
- Uses synthetic data only.
- Uses no external AI APIs, credentials, private manuscripts, payment systems, or network calls.

## Requirement Map

| Issue #16 capability | Implementation |
| --- | --- |
| Auto peer review reports | Emits structured findings, severity, decision, confidence, and remediation. |
| Methodological and reproducibility red flags | Detects identifier gaps, stale validation, contamination, passage errors, organism mismatch, and antibody target mismatch. |
| Adaptive templates per domain | Supports packet-level `domain` and domain-specific reviewer notes. |
| Claims vs evidence alignment | Compares material identity and validation evidence against linked assays and manuscript claims. |
| Reproducible deterministic output | Demo and tests use fixed synthetic packets and dependency-free scoring. |

## Run

```bash
npm test
npm run demo
npm run video
npm run check
```

Demo artifacts are written to `reports/`:

- `summary.json`
- `reviewer-packet.md`
- `summary.svg`
- `demo.mp4`

## Decisions

- `RELEASE`: materials are traceable, authenticated, fresh, and aligned with the linked assays.
- `REVIEW`: a reviewer should inspect missing identifiers, stale validation, species mismatch, or incomplete material provenance.
- `HOLD`: release is blocked by critical reproducibility problems such as contamination, impossible passage metadata, or antibody target mismatch.

## AI Assistance Disclosure

Implemented with Codex assistance and locally verified with deterministic tests and generated artifacts.
