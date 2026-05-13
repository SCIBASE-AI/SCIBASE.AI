# AI Research Copilot Suite

Self-contained MVP for SCIBASE issue #16. The module implements deterministic engines for:

- auto peer review reports
- reproducibility checks
- research gap discovery
- a browser dashboard and JSON API for reviewer validation

No external packages or hosted AI services are required. The implementation uses rule-based scoring and explicit fixtures so maintainers can run it locally and inspect every decision.

## Quick Start

```bash
cd ai-research-copilot-suite
npm test
npm run smoke
npm start
```

Open `http://localhost:4316`.

## API Smoke Checks

```bash
curl -s http://localhost:4316/api/dashboard
curl -s http://localhost:4316/api/review
curl -s http://localhost:4316/api/reproducibility
curl -s http://localhost:4316/api/gaps
```

## Requirement Mapping

| Issue requirement | Implementation |
| --- | --- |
| Auto peer review reports | `buildPeerReviewReport` scores clarity, methods, statistics, evidence alignment, data/code availability, ethics, and citation coverage. |
| Adaptive templates by domain | `DOMAIN_TEMPLATES` changes section weights and checks for molecular biology, clinical trials, and computational science. |
| Reproducibility checker | `buildReproducibilityCheck` validates raw data manifests, pinned environments, deterministic seeds, executable notebooks, expected outputs, and prior replication attempts. |
| Confidence score | `buildReproducibilityCheck` returns a 0-100 confidence score with blocking and warning findings. |
| Links to previous attempts | The reproducibility response includes prior attempts with status, actor, date, and evidence links. |
| Research gap finder | `findResearchGaps` ranks under-studied intersections, unresolved questions, low-replication high-citation clusters, and negative-result follow-ups. |
| Personalized opportunity feed | `findResearchGaps` uses researcher interests, lab capabilities, and project history to rank opportunities. |
| Embedded suite dashboard | `src/server.js` serves `/` plus JSON endpoints for review, reproducibility, and gap discovery. |

## Demo

- Browser demo: run `npm start` and open `http://localhost:4316`.
- Short demo video: [`docs/demo/research-copilot-demo.webm`](./docs/demo/research-copilot-demo.webm).
- Demo script: [`docs/demo-script.md`](./docs/demo-script.md).
- Static screenshot: [`docs/demo/dashboard.svg`](./docs/demo/dashboard.svg).

## AI Disclosure

This contribution was prepared with OpenAI Codex assistance. The generated code, tests, and documentation were manually reviewed and validated locally before submission.
