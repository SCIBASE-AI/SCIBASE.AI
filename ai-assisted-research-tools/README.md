# AI-Assisted Research Tools

This module is a self-contained implementation for SCIBASE.AI issue #13. It provides a runnable MVP for three AI-assisted research workflows: paper summarization, peer review diagnostics, and citation recommendation.

## What It Covers

- AI Paper Summarizer
  - Abstract, executive, and layperson summary modes.
  - Domain-aware keyword extraction and manuscript profiling.
  - Key findings, implications, and recommended next steps.
- AI Peer Review Aid
  - Diagnostic report for similarity, grammar/clarity, statistical reporting, and compliance gaps.
  - Domain templates for biology, physics, and social science.
  - Checklist output for ethics, consent, data availability, uncertainty, and related statements.
- AI Citation Tool
  - Context-aware citation retrieval from a local open-corpus fixture.
  - APA, MLA, and Nature formatting.
  - Similar-paper suggestions and manuscript insertion snippets.
- Browser demo and JSON API
  - Static dashboard for reviewers.
  - No external services, keys, seed funding, or paid APIs required.

## Run Locally

```bash
cd ai-assisted-research-tools
npm test
npm start
```

Then open `http://localhost:4128`.

## API Surface

- `GET /api/dashboard` returns the full manuscript profile, all summary modes, peer review report, and citation recommendations.
- `GET /api/summarize?mode=abstract|executive|layperson` returns one summary mode.
- `GET /api/review` returns the diagnostic peer review report.
- `GET /api/citations?style=APA|MLA|Nature` returns formatted citation recommendations.

## Requirement Mapping

- Concise summaries of repositories, preprints, or uploaded PDFs: implemented as manuscript section summarization in `src/research-ai.js`.
- Abstract, executive, and layperson modes: implemented by `summarizePaper`.
- Domain-aware output: implemented through keyword extraction, domain inference, and review templates.
- Key findings, implications, and next steps: returned by `summarizePaper`.
- Peer review diagnostic reports: implemented by `peerReviewAid`.
- Plagiarism/similarity, grammar/clarity, statistical, and compliance checks: implemented by dedicated detector functions in `src/research-ai.js`.
- Custom templates for biology, physics, and social science: configured in `src/data/open-corpus.js`.
- Citation recommendations from open corpora: implemented by `recommendCitations` using a local Semantic Scholar/arXiv/PubMed-style corpus fixture.
- APA, MLA, and Nature citation formatting: implemented by `formatCitation`.
- Similar papers widget and insert text: returned by `recommendCitations` and rendered in the browser dashboard.

## Verification

```bash
npm test
node src/server.js
```

Optional smoke checks:

```bash
curl -s http://localhost:4128/api/dashboard
curl -s "http://localhost:4128/api/summarize?mode=layperson"
curl -s "http://localhost:4128/api/citations?style=Nature"
```

Demo artifacts are committed under `docs/demo/`.
