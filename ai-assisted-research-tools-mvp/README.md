# AI-Assisted Research Tools MVP

Self-contained implementation for [SCIBASE.AI issue #13](https://github.com/SCIBASE-AI/SCIBASE.AI/issues/13).

This module provides the first production-shaped MVP for three day-one research assistants:

- AI Paper Summarizer
- AI Peer Review Aid
- AI Citation Tool

It uses deterministic local logic and sample corpora so reviewers can run it without API keys, paid model credits, or external services.

## Quick Start

```bash
cd ai-assisted-research-tools-mvp
npm run check
npm start
```

Open `http://localhost:4183` to inspect the demo dashboard.

## API Smoke Checks

```bash
curl -s http://localhost:4183/api/report
curl -s "http://localhost:4183/api/summary?mode=layperson"
curl -s http://localhost:4183/api/review
curl -s "http://localhost:4183/api/citations?style=nature"
```

## Included Artifacts

- `src/research-tools.js`: summarization, peer-review diagnostics, citation matching, and full report composition.
- `data/sample-manuscript.json`: representative manuscript input with abstract, methods, results, compliance declarations, and draft references.
- `data/citation-corpus.json`: local citation candidates with DOI, venue, keywords, and citation counts.
- `test/research-tools.test.js`: focused validation for the three MVP tools.
- `docs/requirement-map.md`: issue requirements mapped to implementation.
- `docs/demo/`: deterministic JSON snapshot and animated GIF walkthrough.
