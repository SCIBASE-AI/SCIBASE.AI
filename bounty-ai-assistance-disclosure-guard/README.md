# Bounty AI Assistance Disclosure Guard

This module adds a focused solver AI-assistance disclosure and provenance guard for the Scientific Bounty System in issue `#18`.

Scientific bounty platforms increasingly receive submissions that mix human research, generated code, generated reports, model-assisted analysis, and tool-produced artifacts. Sponsors and reviewers need a deterministic pre-scoring gate that answers a narrow question: is this AI-assisted submission safe and transparent enough to score?

## Scope

- Checks whether AI assistance is allowed by the challenge policy.
- Requires explicit AI-use disclosure when the policy requires it.
- Checks approved AI/tool lists and tool license compatibility.
- Flags prohibited data classes sent through AI workflows.
- Holds packets with private sponsor data, prompt leakage, or secret-like text.
- Checks human review attestation for AI-assisted deliverables.
- Checks generated components for disclosure, human review, provenance hashes, and submission-license fit.
- Requires reproducibility commands or environment notes for AI-assisted work.
- Produces JSON, Markdown, SVG, and MP4 reviewer artifacts.
- Uses synthetic data only.
- Uses no external AI APIs, credentials, private submissions, payment systems, or network calls.

## Requirement Map

| Issue #18 capability | Implementation |
| --- | --- |
| Submission engine | Validates solver submission packets before sponsor/reviewer scoring. |
| Secure private workspaces | Detects private data and prompt/secret leakage before reviewer handoff. |
| Arbitration and reviewer checklists | Emits severity-coded findings, decisions, confidence, evidence, and remediation. |
| IP and licensing options | Checks generated component and tool licenses against challenge policy. |
| Audit logs and reproducibility | Requires provenance hashes, human review, and reproducibility commands. |
| Multi-phase challenge support | Decisions can be run before proposal, prototype, final scoring, award release, or sponsor handoff. |

## Run

```bash
npm test
npm run demo
npm run video
npm run check
```

Demo artifacts are written to `reports/`:

- `summary.json`
- `reviewer-packet.md`
- `summary.svg`
- `demo.mp4`

## Decisions

- `RELEASE`: disclosure, provenance, human review, and reproducibility evidence are scoring-ready.
- `REVIEW`: missing or incomplete provenance can be repaired before scoring.
- `HOLD`: critical policy violations such as undisclosed AI, prohibited private data, prompt leakage, or AI use in a no-AI challenge block scoring and award release.

## AI Assistance Disclosure

Implemented with Codex assistance and locally verified with deterministic tests and generated artifacts.
