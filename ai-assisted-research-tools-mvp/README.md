# AI-Assisted Research Tools MVP

This module implements a dependency-free MVP for issue #13. It focuses on deterministic research-assistance primitives that can be reviewed locally without external model keys or hosted services.

## Capabilities

- Tool registry for summarization, review, citation, guardrail, and workflow orchestration tools.
- Paper summarizer with section extraction, key finding selection, method summary, limitations, keywords, and traceable evidence snippets.
- Peer-review aid with clarity, evidence, methods, statistics, citation, and reproducibility checks.
- Citation formatter for APA, MLA, BibTeX, DOI, and schema.org-style citation records.
- Safety guardrails that flag sensitive data, missing evidence, unsupported claims, and required human-review checkpoints.
- Batch workflow planner that composes the tools into a reproducible MVP pipeline.
- Local HTTP API for smoke testing and demos.

## Run locally

```bash
npm run check
npm test
PORT=4335 npm start
```

Example endpoints:

- `GET /api/registry`
- `GET /api/summary`
- `GET /api/review`
- `GET /api/citations`
- `GET /api/workflow`
- `GET /api/guardrails`
- `GET /api/dashboard`

## Review notes

The implementation is intentionally deterministic. It does not call LLM providers; instead, it models the contracts, data structures, and reviewer-visible outputs needed for the MVP layer.
