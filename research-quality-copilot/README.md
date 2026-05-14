# Research Quality Copilot

This module provides a self-contained MVP for AI-assisted research tooling. It models the platform surface described in issue #13 without external services or API keys, so maintainers can run and review the workflow locally.

## Capabilities

- Paper summarizer with abstract, executive, and layperson output modes.
- Peer-review aid that checks claims, evidence, statistical reporting, ethics/data availability, clarity, and reproducibility signals.
- Citation recommender that ranks candidate papers against manuscript keywords, methods, datasets, and claim gaps.
- Batch workflow report that ties summaries, peer-review findings, citation suggestions, and guardrail traces into one reviewer-ready payload.
- Local HTTP demo for product/API review.

## Run locally

```bash
npm run check
npm test
PORT=4321 npm start
```

## Demo endpoints

```bash
curl -fsS http://localhost:4321/api/summary
curl -fsS http://localhost:4321/api/review
curl -fsS http://localhost:4321/api/citations
curl -fsS http://localhost:4321/api/workflow
curl -fsS http://localhost:4321/api/dashboard
```

## Design notes

The implementation is deterministic by design. It uses transparent scoring and evidence traces instead of a hidden model call, which makes the MVP easy to test and safe to wire behind a later model provider. The exported service functions accept plain project objects and citation libraries, so they can be adapted to repository uploads, manuscript drafts, or reviewer dashboards.

See [docs/requirement-map.md](docs/requirement-map.md) for the issue coverage map.
