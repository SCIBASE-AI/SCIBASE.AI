# AI Research Tool Audit Trail

Self-contained AI-Assisted Research Tools MVP module for SCIBASE issue #13. It covers the paper summarizer, peer-review aid, and citation tool through an evidence-first audit workflow: deterministic summary modes with evidence spans, claim/evidence alignment, statistical and compliance diagnostics, citation gap detection, formatted references, insertion plans, hallucination guardrails, and batch audit packets.

## Scope

- Paper intake profiling for sections, keywords, claims, citations, and evidence hashes.
- Abstract, executive, and layperson summary modes.
- Summary outputs tied to evidence spans from manuscript sections.
- Claim-to-evidence alignment with missing citation topic detection.
- Peer-review diagnostics for statistical reporting, consent/data availability compliance, claim support, and open-corpus similarity.
- Citation recommendations from a local open-corpus sample.
- APA, MLA, and Nature citation formatting.
- Citation insertion plans mapped back to claim IDs and topics.
- Hallucination guardrail status with blocked outputs and required disclosures.
- Local API endpoints and tests for reviewer validation.

No model API, vector database, PDF parser, or external citation service is required. The module runs entirely from deterministic sample data and pure JavaScript helpers.

## Run Locally

```bash
npm run check
npm test
PORT=4368 npm start
```

Smoke endpoints:

```bash
curl -fsS http://localhost:4368/api/health
curl -fsS http://localhost:4368/api/intake
curl -fsS 'http://localhost:4368/api/summary?mode=abstract'
curl -fsS 'http://localhost:4368/api/summary?mode=executive'
curl -fsS 'http://localhost:4368/api/summary?mode=layperson'
curl -fsS http://localhost:4368/api/claims
curl -fsS http://localhost:4368/api/peer-review
curl -fsS 'http://localhost:4368/api/citations?style=Nature'
curl -fsS http://localhost:4368/api/guardrail
curl -fsS http://localhost:4368/api/audit-packet
```

## Demo Flow

1. Open `/api/intake` to inspect section profiles, claim counts, citation counts, and evidence hashes.
2. Open `/api/summary?mode=abstract`, `/api/summary?mode=executive`, and `/api/summary?mode=layperson` to compare deterministic summary modes.
3. Open `/api/claims` to inspect claim/evidence/citation coverage.
4. Open `/api/peer-review` to see statistical, compliance, similarity, and claim diagnostics.
5. Open `/api/citations?style=Nature` to inspect recommendation scores, formatted references, and insertion plans.
6. Open `/api/guardrail` and `/api/audit-packet` to review hallucination safeguards and batch evidence.

See `docs/requirement-map.md` for issue requirement coverage.
