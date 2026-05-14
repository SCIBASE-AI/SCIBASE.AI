# Requirement Map

## AI Paper Summarizer

- `createPaperSummary(project, { mode })` supports `abstract`, `executive`, and `layperson` modes.
- Summaries include key findings, implications, next steps, and evidence coverage.
- The module accepts repository-like project metadata, manuscripts, datasets, claims, and methods.

## AI Peer Review Aid

- `createPeerReview(project, { template })` produces structured diagnostics for clarity, rigor, novelty, reproducibility, ethics, data availability, and citation completeness.
- Findings are severity-ranked and include evidence, suggested fixes, and affected sections.
- Domain templates can be passed without changing the core scoring logic.

## AI Citation Tool

- `recommendCitations(project, library, { limit })` ranks citations by topical overlap, method relevance, dataset relevance, recency, and existing-reference gaps.
- Recommendations include formatted APA, Nature, and MLA-style strings.
- The output is designed for one-click insertion or a sidebar "similar papers" widget.

## MVP Safety And Traceability

- Every generated payload includes a `trace` array with deterministic evidence.
- No external credentials, paid APIs, or hidden network calls are needed.
- Tests cover summary modes, review severity, citation ranking, formatting, and workflow integration.

## Product Integration Surface

- `src/server.js` exposes `/api/summary`, `/api/review`, `/api/citations`, `/api/workflow`, and `/api/dashboard`.
- `createDashboard(project, library)` returns a compact object suitable for admin or reviewer UI cards.
- `runResearchWorkflow(project, library)` composes all tools into a single review package.
