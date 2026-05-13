# Collaborative Research Editor Ops

Self-contained milestone for [SCIBASE.AI issue #12](https://github.com/SCIBASE-AI/SCIBASE.AI/issues/12).

It implements the core collaboration primitives behind a scientific real-time editor:

- structured Markdown, LaTeX, figure, citation, and notebook blocks
- deterministic insert/update/delete operations with section-lock enforcement
- live presence and cursor payloads
- inline comments, suggestions, task assignments, and status transitions
- autosave snapshots and named versions for time-machine restore flows
- notebook cell metadata for language, kernel, outputs, and inline annotations
- publication outline export for manuscript review
- dependency-free JSON API/demo server

## Run

```bash
cd collaborative-research-editor-ops
npm run check
npm test
npm start
```

Open `http://localhost:4320` or inspect:

```bash
curl -s http://localhost:4320/api/document
curl -s http://localhost:4320/api/session
curl -s http://localhost:4320/api/versions
curl -s http://localhost:4320/api/tasks
curl -s http://localhost:4320/api/export
```

## Implementation Notes

The module deliberately keeps the collaboration engine deterministic and local. A production transport layer can feed the same operation shapes over WebSockets or CRDT infrastructure later, while maintaining the existing validation, locks, comments, task, and version semantics.

## Files

- `src/editor.js` - document operation, presence, comment, task, version, and export engine.
- `src/sample-data.js` - representative manuscript with notebook and LaTeX blocks.
- `src/server.js` - local JSON API and reviewer dashboard.
- `test/editor.test.js` - Node tests for core collaboration workflows.
- `docs/requirement-map.md` - direct mapping from issue requirements to implementation evidence.

## Disclosure

Prepared with OpenAI Codex assistance. The implementation and tests were run locally before submission.
