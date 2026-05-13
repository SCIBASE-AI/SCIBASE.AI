# Scientific Repository Versioning

Self-contained implementation milestone for [SCIBASE.AI issue #10](https://github.com/SCIBASE-AI/SCIBASE.AI/issues/10).

It models the project repository as the atomic scientific workspace:

- repository component manifests for manuscript, data, code, notebooks, results, protocols, and metadata
- hash-based integrity tracking
- commits, rollback metadata, semantic tags, and branch pointers
- fork attribution and downstream derivation tracking
- merge requests with discussion, review, and mergeability state
- editor/diff metadata for Markdown, LaTeX, CSV, JSON, Jupyter, Python, R, and Julia files
- reproducibility pipeline checks for raw data, code, environment, sandbox, and expected outputs
- DOI/citation generation and export metadata
- dependency-free JSON API/demo server

## Run

```bash
cd scientific-repository-versioning
npm run check
npm test
npm start
```

Open `http://localhost:4328` or inspect:

```bash
curl -s http://localhost:4328/api/manifest
curl -s http://localhost:4328/api/versioning
curl -s http://localhost:4328/api/merge-request
curl -s http://localhost:4328/api/reproducibility
curl -s http://localhost:4328/api/citation
curl -s http://localhost:4328/api/export
```

## Implementation Notes

This milestone avoids a real Git backend but keeps Git-compatible concepts explicit: content hashes, commits, tags, branch refs, forks, and merge requests. A production adapter can later map these records to Git/LFS storage.

## Files

- `src/repository.js` - manifest, versioning, fork, MR, diff, reproducibility, citation, and export logic.
- `src/sample-data.js` - representative scientific project repository fixture.
- `src/server.js` - local API and reviewer dashboard.
- `test/repository.test.js` - Node tests for repository workflows.
- `docs/requirement-map.md` - direct mapping from issue requirements to implementation evidence.

## Disclosure

Prepared with OpenAI Codex assistance. The implementation and tests were run locally before submission.
