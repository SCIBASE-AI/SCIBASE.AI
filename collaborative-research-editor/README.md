# Collaborative Research Editor

This module is a self-contained implementation for SCIBASE.AI issue #12. It turns the requested collaborative research editor into a runnable prototype with deterministic server-side document operations, a browser UI, tests, and demo assets.

## What It Covers

- Rich scientific blocks for Markdown, LaTeX, code, figures, tables, and notebook cells.
- Live collaboration state with user presence, cursor position, comments, suggestions, and task assignment.
- Version history snapshots for a time-machine style restore interface.
- Section locks for finalized abstracts, figures, datasets, or submission-ready sections.
- Publication outline generation with citations and cross-reference metadata.
- A no-dependency Node.js API and static browser interface.

## Run Locally

```bash
cd collaborative-research-editor
npm test
npm start
```

Then open `http://localhost:4127`.

## API Surface

- `GET /api/document` returns the active document, publication outline, and collaboration manifest.
- `POST /api/operation` applies a document operation. Supported operation types are `insert-block`, `update-block`, `move-block`, `delete-block`, `comment`, `suggestion`, `task`, `presence`, `lock-section`, and `save-version`.

## Demo

The demo shows a manuscript workspace with live collaborators, scientific blocks, publication outline, open review items, and workflow actions for reviewer comments, abstract suggestions, section locks, and version saves.

Demo artifacts are committed under `docs/demo/`.
