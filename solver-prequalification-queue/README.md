# Solver Prequalification Queue

This module adds a focused solver/team prequalification gate for the Scientific Bounty System. It evaluates candidate teams before private workspace access or multi-phase challenge participation, so sponsors get qualified submissions and solvers do not spend time on challenges they cannot safely access.

## What It Covers

- Expertise fit against challenge-specific scientific requirements.
- Availability checks against milestone cadence.
- NDA readiness for private or sensitive challenges.
- Recent sponsor-affiliation conflict detection.
- Identity-attestation and active-submission workload controls.
- Anonymous challenge handling through reviewer-safe display names.
- Signed audit events and deterministic reviewer packets.

## Files

- `index.js` - scoring, decisioning, packet generation, and signing logic.
- `sample-data.js` - synthetic challenges, teams, skills, NDA state, and affiliations.
- `test.js` - regression coverage for approved, review, and blocked decisions.
- `demo.js` - writes JSON, Markdown, SVG, and MP4 review artifacts.
- `requirements-map.md` - maps the implementation to issue #18 requirements.
- `acceptance-notes.md` - reviewer notes and validation commands.

## Run

```bash
node solver-prequalification-queue/test.js
node solver-prequalification-queue/demo.js
```

Generated demo artifacts:

- `prequalification-report.json`
- `coordinator-review-packet.md`
- `demo.svg`
- `demo.mp4`
