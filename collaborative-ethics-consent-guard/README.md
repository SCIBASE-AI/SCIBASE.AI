# Collaborative Ethics and Consent Guard

This module adds a focused collaborative ethics-and-consent export guard for the Real-Time Collaborative Editor in issue `#12`.

Collaborative manuscripts can accumulate edits, comments, translations, and locked-section changes across many users. Before export, the editor needs a deterministic gate that checks whether ethics and consent content is safe to publish and whether private reviewer or participant details are still embedded in collaborative state.

## Scope

- Checks human-subjects manuscripts for ethics approval identifiers.
- Flags expired approvals and missing exemption rationale.
- Checks vulnerable-population review evidence.
- Checks consent statement presence and waiver rationale.
- Compares consent scope against the requested export scope.
- Checks required translated-consent coverage.
- Flags pending edits in locked ethics/consent sections without approved override.
- Flags stale ethics-section review after collaborative edits.
- Holds exports with private ethics comments or participant-like identifiers.
- Produces JSON, Markdown, SVG, and MP4 reviewer artifacts.
- Uses synthetic data only.
- Uses no external APIs, private manuscripts, real participant data, credentials, payment systems, or network calls.

## Requirement Map

| Issue #12 capability | Implementation |
| --- | --- |
| Real-time collaboration | Reviews collaborative comments, pending edits, locks, and section state before export. |
| Change tracking and suggestions | Detects pending ethics edits and unresolved ethics comments. |
| Rich scientific manuscript export | Guards ethics/consent statements before manuscript export. |
| Version history and autosave | Checks review freshness after collaborative changes. |
| Inline comments and review sidebar | Blocks private reviewer notes and participant-like identifiers from public export. |
| Publication-ready formatting | Confirms consent scope, translated-consent coverage, and ethics approval metadata. |

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

- `RELEASE`: ethics, consent, comments, and export scope are publication-ready.
- `REVIEW`: missing or stale evidence can be repaired before export.
- `HOLD`: missing approval/consent, expired approval, private comment leakage, or participant identifiers block export.

## AI Assistance Disclosure

Implemented with Codex assistance and locally verified with deterministic tests and generated artifacts.
