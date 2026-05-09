# SCIBASE.AI AI Research Assistant Suite

Self-contained implementation for issue #16. The module provides deterministic assistant workflows that can later be backed by hosted LLMs or scientific models:

- Auto peer review reports with domain templates, statistical checks, ethics/data availability checks, and claims-versus-evidence flags
- Reproducibility confidence checks across notebooks, execution environments, dataset manifests, run commands, and deterministic seeds
- Research gap finder using project keywords, citation signals, replication counts, and unresolved questions from a seed corpus
- Combined project dashboard with review score, reproducibility score, top gap novelty, and readiness score
- JSON APIs and demo UI for reviewer smoke tests
- Unit tests for review generation, reproducibility scoring, gap discovery, and dashboard composition

## Run locally

```bash
cd ai-research-assistant-suite
npm install
npm run dev
```

Open `http://localhost:3002`.

## Verify

```bash
npm run typecheck
npm test
npm run build
```

## Demo API

```bash
curl -s http://localhost:3002/api/dashboard/project_organoid_response | jq .
curl -s http://localhost:3002/api/review/project_organoid_response | jq .
curl -s http://localhost:3002/api/reproducibility/project_organoid_response | jq .
curl -s http://localhost:3002/api/gaps/project_organoid_response | jq .
```

## Demo artifact

- `docs/demo/dashboard.png`
- `docs/demo/ai-research-assistant-suite-demo.mp4`

## Production integration notes

The deterministic services are designed as stable boundaries for production model adapters:

- `generatePeerReview` can accept LLM-generated findings after schema validation.
- `runReproducibilityChecks` can call a sandbox runner and merge execution logs into the same report shape.
- `findResearchGaps` can swap the seed corpus for vector search, citation graph traversal, or Semantic Scholar/PubMed connectors.
- The current implementation avoids raw private-content export and uses project-local artifacts only.
