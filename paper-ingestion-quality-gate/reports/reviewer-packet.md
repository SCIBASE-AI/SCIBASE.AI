# Paper Ingestion Quality Gate Report

Generated: 2026-08-15T22:05:11.925Z
Packets analyzed: 4
Decision counts: SUMMARIZE 1, REVIEW 1, HOLD 2

## Findings

### ingest-summarize-001: Clean paper intake for abstract and executive summary generation

Decision: SUMMARIZE
Completeness: 0.984

- No intake quality risk detected.

Recommended actions:
- Allow AI summarization with normal extraction provenance attached.

### ingest-hold-002: OCR-only scan with missing methods and dropped pages

Decision: HOLD
Completeness: 0.528

- CRITICAL PDF_PAGE_DROP_DETECTED: The source paper has pages that were not extracted.
- CRITICAL REQUIRED_SECTION_MISSING: Required scientific sections are missing from the extracted text map.
- CRITICAL OCR_OR_ENCODING_QUALITY_LOW: OCR confidence or glyph quality is too poor for a reliable AI-generated summary.
- CRITICAL TABLE_EXTRACTION_INCOMPLETE: One or more expected tables were not extracted for summarizer grounding.
- MAJOR FIGURE_CAPTION_MAP_INCOMPLETE: Figure captions are missing from the summarizer intake packet.
- MAJOR REFERENCE_PARSE_COVERAGE_LOW: Reference parsing coverage is too low for reliable related-work or implication summaries.
- MAJOR EQUATION_EXTRACTION_COVERAGE_LOW: Equation extraction coverage is below the configured summarizer threshold.
- MAJOR EXTRACTION_PROVENANCE_INCOMPLETE: The intake packet lacks required extraction provenance flags.
- CRITICAL INTAKE_COMPLETENESS_BELOW_THRESHOLD: Overall source extraction completeness is below the AI summarizer safety threshold.
- CRITICAL SUMMARIZER_NOT_GATED_ON_CLEAN_INTAKE: AI key-finding generation is enabled while source-ingestion quality findings are unresolved.

Recommended actions:
- Disable key-finding generation until intake quality is clean.
- Attach the intake findings to the AI summarizer queue.
- Regenerate extraction artifacts before key findings or implications are generated.
- Show reviewers which source sections, tables, figures, or references are unsafe.

### ingest-review-003: Good text extraction with incomplete tables and captions

Decision: REVIEW
Completeness: 0.877

- MAJOR TABLE_EXTRACTION_INCOMPLETE: One or more expected tables were not extracted for summarizer grounding.
- MAJOR FIGURE_CAPTION_MAP_INCOMPLETE: Figure captions are missing from the summarizer intake packet.
- MAJOR EXTRACTION_PROVENANCE_INCOMPLETE: The intake packet lacks required extraction provenance flags.

Recommended actions:
- Attach the intake findings to the AI summarizer queue.
- Regenerate extraction artifacts before key findings or implications are generated.
- Show reviewers which source sections, tables, figures, or references are unsafe.

### ingest-hold-004: Reference and equation extraction failure before implications summary

Decision: HOLD
Completeness: 0.824

- MAJOR REFERENCE_PARSE_COVERAGE_LOW: Reference parsing coverage is too low for reliable related-work or implication summaries.
- MAJOR EQUATION_EXTRACTION_COVERAGE_LOW: Equation extraction coverage is below the configured summarizer threshold.
- MAJOR EXTRACTION_PROVENANCE_INCOMPLETE: The intake packet lacks required extraction provenance flags.
- CRITICAL SUMMARIZER_NOT_GATED_ON_CLEAN_INTAKE: AI key-finding generation is enabled while source-ingestion quality findings are unresolved.

Recommended actions:
- Disable key-finding generation until intake quality is clean.
- Attach the intake findings to the AI summarizer queue.
- Regenerate extraction artifacts before key findings or implications are generated.
- Show reviewers which source sections, tables, figures, or references are unsafe.
