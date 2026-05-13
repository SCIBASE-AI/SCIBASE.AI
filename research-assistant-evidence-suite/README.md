# Research Assistant Evidence Suite

Self-contained milestone for [SCIBASE.AI issue #16](https://github.com/SCIBASE-AI/SCIBASE.AI/issues/16). It implements deterministic assistant workflows that can later be backed by hosted AI models while still giving maintainers a runnable, inspectable MVP today.

## What It Covers

- Auto peer-review reports with domain-aware checks for clarity, methods, statistics, ethics, data availability, citation coverage, and claims-versus-evidence alignment.
- Reproducibility checks for artifact manifests, pinned environments, executable commands, deterministic seeds, expected outputs, and prior reproduction attempts.
- Research-gap discovery that ranks under-studied topic intersections, unresolved questions, low-replication/high-citation areas, and negative-result follow-ups.
- Evidence-linked dashboard payload that combines review risk, reproducibility confidence, opportunity score, and readiness status.
- No external services, API keys, model calls, or package installs required.

## Run

```bash
cd research-assistant-evidence-suite
npm test
npm run check
npm start
```

Open `http://localhost:4316` or inspect the JSON endpoints:

```bash
curl -s http://localhost:4316/api/dashboard
curl -s http://localhost:4316/api/review
curl -s http://localhost:4316/api/reproducibility
curl -s http://localhost:4316/api/gaps
```

## Design Notes

The implementation keeps the model boundary explicit: all current checks are deterministic and schema-shaped. A production LLM, vector search, citation graph, or sandbox runner can be plugged in later by replacing the evidence providers while preserving the public report shapes.

## Files

- `src/assistant.js` - review, reproducibility, gap, and dashboard engines.
- `src/sample-data.js` - reviewable fixture project, corpus, and researcher profile.
- `src/server.js` - dependency-free local API/demo server.
- `test/assistant.test.js` - Node test coverage for the main assistant workflows.
- `docs/requirement-map.md` - direct mapping from issue requirements to implementation evidence.

## Disclosure

Prepared with OpenAI Codex assistance. The code and tests were run locally before submission.
