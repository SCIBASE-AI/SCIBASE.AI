# Paper Ingestion Quality Gate

This contribution adds a focused intake guard for the AI Paper Summarizer in SCIBASE's AI-Assisted Research Tools MVP. It checks whether an uploaded or repository-linked paper has been extracted cleanly enough before an AI summarizer generates key findings, implications, or next steps.

The slice is intentionally narrow. It does not score the generated summary, validate citation context, check journal venue quality, assess statistics, run reporting guidelines, detect plagiarism, or review disclosure statements. It sits earlier in the workflow: before summarization, when broken PDF/OCR/table/reference extraction can quietly poison every downstream AI output.

## What It Checks

- Dropped pages between the source PDF and extracted text.
- Required scientific sections: abstract, methods, results, and discussion.
- OCR confidence and unrecognized glyph noise.
- Table extraction completeness before numeric key findings are generated.
- Figure caption extraction before figure-derived summary bullets are allowed.
- Reference parsing coverage before citation-based implications are generated.
- Equation extraction coverage for mathematical or methods summaries.
- Required extraction provenance for text, sections, tables, figures, references, and digests.
- Whether key-finding generation is incorrectly enabled while intake findings are unresolved.

## Running Locally

```bash
npm test
npm run demo
npm run check
npm run video
```

The demo uses only synthetic intake packets in `data/sample_ingestion_packets.json`.

Generated files:

- `reports/summary.json`
- `reports/reviewer-packet.md`
- `reports/summary.svg`
- `reports/demo.mp4`

The MP4 is generated from an FFmpeg color source and drawtext slate. It is not a screen recording and contains no desktop capture or private information.

## Why This Matters

AI summarizers can sound confident even when source extraction is broken. A missing methods section, low-quality OCR, dropped pages, unparsed tables, or failed references can lead to unsupported key findings and misleading implications.

This guard creates a deterministic intake review packet so SCIBASE can:

1. Block summarization when the source is incomplete.
2. Route questionable intake packets for manual review.
3. Suppress table, figure, reference, or equation-derived summary bullets when extraction is incomplete.
4. Preserve extraction provenance for reviewers and collaborators.
