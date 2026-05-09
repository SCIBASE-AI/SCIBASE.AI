# SCIBASE.AI AI Research Assistant Suite

Self-contained implementation for issue #16. The module provides deterministic assistant workflows that can later be backed by hosted LLMs or scientific models:

- Auto peer review reports with domain templates, review-dataset profile metadata, statistical checks, ethics/data availability checks, citation checks, and claims-versus-evidence flags
- Reproducibility confidence checks across notebooks, execution environments, pinned dependencies, dataset manifests, pipeline artifacts, validation splits, expected outputs, run commands, deterministic seeds, and previous attempts
- Research gap finder using project keywords, citation signals, replication counts, unresolved questions, limitations, and negative-result follow-ups from a seed corpus
- Combined project dashboard with review score, reproducibility score, top gap novelty, and readiness score
- JSON APIs and demo UI for reviewer smoke tests
- Unit tests for review generation, reproducibility scoring, sandbox metadata, gap discovery, and dashboard composition

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

- `generatePeerReview` exposes the model/rubric profile and can accept LLM-generated findings after schema validation.
- `runReproducibilityChecks` already returns sandbox metadata and previous-attempt links; production can replace the local simulator with a real notebook/container runner.
- `findResearchGaps` can swap the seed corpus for vector search, citation graph traversal, or Semantic Scholar/PubMed connectors while preserving the same opportunity schema.
- The current implementation avoids raw private-content export and uses project-local artifacts only.
