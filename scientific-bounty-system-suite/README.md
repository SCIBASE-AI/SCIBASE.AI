# Scientific Bounty System Suite

Self-contained MVP for SCIBASE issue #18. The module implements deterministic workflows for:

- scientific challenge posting and rubric validation
- multi-phase private submission packages
- arbitration and reviewer checklists
- prize and milestone payout routing
- IP policy options
- a browser dashboard and JSON API for reviewer validation

No external packages or hosted AI services are required. The implementation uses explicit fixtures and rule-based checks so maintainers can run it locally and inspect every decision.

## Quick Start

```bash
cd scientific-bounty-system-suite
npm test
npm run smoke
npm start
```

Open `http://localhost:4318`.

## API Smoke Checks

```bash
curl -s http://localhost:4318/api/dashboard
curl -s http://localhost:4318/api/challenge
curl -s http://localhost:4318/api/submission
curl -s http://localhost:4318/api/arbitration
curl -s http://localhost:4318/api/payouts
```

## Requirement Mapping

| Issue requirement | Implementation |
| --- | --- |
| Challenge posting portal | `buildChallengePortal` validates problem context, deliverables, evaluation rubric, timeline, prize schedule, visibility, pre-qualification, NDA setting, and R&D template. |
| Templates by vertical | `VERTICAL_TEMPLATES` maps biotech, materials, climate, ML, and chemistry challenges to required context and deliverables. |
| Submission engine | `buildSubmissionPackage` creates team workspace metadata, versioned deliverables, audit log, package manifest, anonymity mode, and phase status. |
| Secure/private project spaces | Submission package includes access policy, team roles, audit events, and data room classification. |
| Multi-phase challenges | Challenge and submission payloads include proposal, prototype, and final milestone phases. |
| Arbitration workflow | `buildArbitrationWorkflow` generates deliverable checklists, reviewer assignments, feedback loop status, risk flags, and award recommendation. |
| Reward distribution | `buildPayoutPlan` routes escrowed prizes across team members, institutions, milestones, honorable mentions, and payout status. |
| IP management options | `resolveIpPolicy` supports solver-retained, sponsored-transfer, and open-license policies with payout-linked terms. |
| Embedded system dashboard | `src/server.js` serves `/` plus JSON endpoints for challenge, submission, arbitration, and payout validation. |

## Demo

- Browser demo: run `npm start` and open `http://localhost:4318`.
- Short demo video: [`docs/demo/scientific-bounty-demo.webm`](./docs/demo/scientific-bounty-demo.webm).
- Demo script: [`docs/demo-script.md`](./docs/demo-script.md).
- Static screenshot: [`docs/demo/dashboard.svg`](./docs/demo/dashboard.svg).

## AI Disclosure

This contribution was prepared with OpenAI Codex assistance. The generated code, tests, documentation, and demo artifacts were manually reviewed and validated locally before submission.
