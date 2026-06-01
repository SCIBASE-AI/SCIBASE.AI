# Sample Custody Quality Graph Guard

Self-contained reviewer artifact for SCIBASE issue #17, focused on sample custody and cold-chain quality before sample nodes are exposed in scientific knowledge graph entity pages or recommendations.

This slice is intentionally narrow. It does not duplicate broad graph extraction/navigation, geospatial sample provenance, organism/strain boundaries, biological accession crosswalks, measurement harmonization, software dependency provenance, evidence freshness, temporal validity, image metadata provenance, funding provenance, or clinical-trial registry work.

## What It Checks

- Collection provenance has timestamps, site ids, and protocol ids.
- Preservation protocol and preservation timing are present and inside policy windows.
- Chain-of-custody handoffs are complete, signed, and contiguous.
- Cold-chain temperature logs exist and have no policy-breaking excursions.
- Freeze-thaw cycles and integrity scores meet quality thresholds.
- Required sample-to-protocol, sample-to-dataset, and sample-to-assay graph edges are present.
- Unsafe sample graph edges are held with deterministic remediation actions.

## Local Verification

```sh
npm run check
npm test
npm run demo
npm run verify-video
```

`npm run demo` writes reviewer artifacts to `reports/`:

- `clean-audit.json`
- `risky-audit.json`
- `risky-review.md`
- `summary.svg`
- `manifest.json`
- `demo.mp4`

## Requirement Mapping

- Scientific knowledge graph integration: evaluates sample nodes before entity pages and recommendations publish.
- Provenance quality: links custody, preservation, temperature, and assay-quality evidence to graph edge publication.
- Recommendation safety: holds degraded or uncertain sample edges before they can influence discovery paths.
- Reviewer demonstration: synthetic clean/risky packets produce JSON, Markdown, SVG, and MP4 artifacts without credentials or external services.
