# Citation Context-Fit Assistant

Self-contained AI-Assisted Research Tools slice for
`SCIBASE-AI/SCIBASE.AI#13`.

The assistant validates citation recommendations before one-click insertion. It
checks whether each candidate supports, contradicts, only contextualizes, or is
irrelevant to the highlighted manuscript claim. It also checks citation intent
labels, evidence strength, field fit, stale evidence, and whether contradictory
citations include an explicit contrast note. It also fails closed on duplicate
claim or candidate identities, malformed normalized scores, future or invalid
publication years, and unsupported relation or intent labels so malformed
assistant output cannot silently become insertion-ready.

This is intentionally separate from broad AI tool suites, evidence-grounded
summarizers, citation provenance, citation metadata integrity, citation style
normalization, citation diversity, citation retraction watch, methods
reproducibility, figure/table evidence, protocol deviation, novelty overlap,
manuscript similarity, ethics/data availability, statistical consistency, study
power, unit consistency, supplementary readiness, and biomethods provenance
slices.

## Run

```bash
npm run check
npm test
npm run demo
npm run demo:video
```

## Outputs

- `reports/summary.json`
- `reports/reviewer-packet.md`
- `reports/summary.svg`
- `reports/demo.webm`

All data is synthetic. The module does not call DOI registries, Crossref,
PubMed, arXiv, Semantic Scholar, publishers, external corpora, or live citation
insertion systems.
