# Collaborative Glossary and Acronym Guard

Self-contained reviewer artifact for SCIBASE issue #12, focused on terminology consistency inside a real-time collaborative research editor.

This slice is intentionally narrow. It validates glossary and acronym readiness before manuscript export rather than duplicating existing editor, notebook, citation, equation, table, clipboard, accessibility, data-availability, or mode-toggle submissions.

## What It Checks

- First-use acronym expansion before publication export.
- Acronym collisions when collaborators use the same abbreviation for different concepts.
- Missing, draft, or incomplete glossary definitions.
- Export manifest completeness for terms that appear in manuscript sections.
- Locked-section terminology edits that lack current collaborator approval.
- Stale term anchors after section version changes.
- Private reviewer, anonymous-review, local-path, or collaborator-only terminology notes leaking into public exports.
- Blocking terminology review comments.

## Local Verification

```sh
npm run check
npm test
npm run demo
npm run verify-video
```

`npm run demo` writes reviewer artifacts to `reports/`:

- `clean-audit.json`
- `risky-audit.json`
- `risky-review.md`
- `summary.svg`
- `manifest.json`
- `demo.mp4`

## Requirement Mapping

- Real-time collaboration: proposed terminology edits are evaluated against section locks, current section hashes, and collaborator approvals.
- Research editor interface: glossary entries bind to manuscript sections and export manifests.
- Scientific writing support: acronyms, first-use expansion, discipline-specific definitions, and term collisions are checked deterministically.
- Export readiness: public glossary output is separated from private notes and unresolved terminology comments.
- Reviewer demonstration: synthetic clean and risky packets produce JSON, Markdown, SVG, and MP4 artifacts without credentials or external services.
