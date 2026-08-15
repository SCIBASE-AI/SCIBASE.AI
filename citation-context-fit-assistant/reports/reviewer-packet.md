# Citation Context-Fit Assistant

Manuscript: Synthetic Microbiome Intervention Review
Issue: SCIBASE-AI/SCIBASE.AI#13
Decision: block-unsafe-citation-insertions
Score: 0

## Insertion Decisions

- cand-001 for claim-001: allow-insertion
- cand-002 for claim-002: suppress
  - Rules: contradictory-citation-for-supporting-claim, contradictory-citation-note-missing
- cand-003 for claim-003: allow-insertion
- cand-004 for claim-001: suppress
  - Rules: citation-context-irrelevant, direct-support-evidence-too-weak, citation-field-fit-too-low

## Findings

- **critical / contradictory-citation-for-supporting-claim**: cand-002 contradicts a claim that requested direct support.
  - Action: Block one-click insertion unless the manuscript text is rewritten as a contrast or limitation.
  - Refs: cand-002, claim-002
- **high / contradictory-citation-note-missing**: cand-002 is contradictory but has no insertion note.
  - Action: Require an explicit contrast note before insertion.
  - Refs: cand-002, claim-002
- **critical / citation-context-irrelevant**: cand-004 is irrelevant to claim-001.
  - Action: Suppress the recommendation from the citation tool.
  - Refs: cand-004, claim-001
- **high / direct-support-evidence-too-weak**: cand-004 evidence strength 0.3 is below support threshold.
  - Action: Downgrade the candidate to background/context or require a stronger source.
  - Refs: cand-004, claim-001
- **high / citation-field-fit-too-low**: cand-004 field overlap 0.18 is below the accepted threshold.
  - Action: Hold the candidate for manual review or retrieve a field-matched citation.
  - Refs: cand-004, claim-001, environmental-microbiology

## Safety

- Synthetic manuscript claims and citation candidates only
- No DOI, Crossref, PubMed, arXiv, Semantic Scholar, publisher, or external corpus calls
- No private manuscripts, credentials, real literature metadata, or live citation insertions
