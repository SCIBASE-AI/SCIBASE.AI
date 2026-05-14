# Bounty Intake Compliance Gate

Self-contained Scientific Bounty System module for SCIBASE issue #18. It focuses on sponsor-side challenge posting readiness: challenge templates, deliverables, rubrics, milestones, prize escrow, NDA handling, participant prequalification, IP policy checks, and publish/hold decisions.

## Scope

- Challenge posting validation for problem statement, scientific context, target outcome, R&D vertical, and visibility.
- Deliverable checks for notebooks, datasets, whitepapers, models, reports, and code.
- Rubric validation with weighted criteria that must sum to 100.
- Milestone and payout schedule validation.
- Prize and escrow readiness checks.
- NDA and sensitive data-room checks for private challenges.
- Participant prequalification scoring for ORCID, institution, domain experience, conflict disclosure, NDA, and prior completions.
- IP policy checks that prevent sponsor-side transfer before payout.
- Publish/hold decisions with blocker and warning evidence.
- Sponsor audit packet export with deterministic hashes.
- Local API endpoints and tests for reviewer validation.

No marketplace backend, payment processor, identity provider, or model API is required. The module runs entirely from deterministic sample data and pure JavaScript helpers.

## Run Locally

```bash
npm run check
npm test
PORT=4364 npm start
```

Smoke endpoints:

```bash
curl -fsS http://localhost:4364/api/health
curl -fsS http://localhost:4364/api/dashboard
curl -fsS 'http://localhost:4364/api/validate?id=challenge-biomarker-rna'
curl -fsS 'http://localhost:4364/api/publish-decision?id=challenge-climate-forecast'
curl -fsS 'http://localhost:4364/api/prequalification?challenge=challenge-biomarker-rna&application=app-immune-lab'
curl -fsS 'http://localhost:4364/api/audit-packet?id=challenge-biomarker-rna'
```

## Demo Flow

1. Open `/api/dashboard` to compare publish-ready and held challenges.
2. Open `/api/validate?id=challenge-biomarker-rna` to see a funded private biotech challenge pass the gate.
3. Open `/api/publish-decision?id=challenge-climate-forecast` to see blockers for missing scientific context, underweighted rubric, and unfunded escrow.
4. Open `/api/prequalification?challenge=challenge-biomarker-rna&application=app-immune-lab` to inspect participant readiness.
5. Open `/api/audit-packet?id=challenge-biomarker-rna` to review sponsor, NDA, IP, escrow, and prequalification evidence.

See `docs/requirement-map.md` for issue requirement coverage.
