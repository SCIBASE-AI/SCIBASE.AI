# Requirement Map

| Issue #10 requirement | Implementation evidence |
| --- | --- |
| Repository structure and components | `buildRepositoryManifest` validates manuscript/data/code/notebooks/results/protocols/metadata components. |
| File and metadata versioning | `createCommit`, `createTag`, and `buildVersionGraph` model commits, tags, branches, and rollback metadata. |
| Git-compatible backend concepts | Commit hashes, branch refs, parent commits, and LFS markers are modeled in repository records. |
| Hash-based integrity | `hashContent` and manifest component hashes. |
| Collaboration and forking | `createForkRecord` preserves upstream, fork owner, reason, and attribution. |
| Merge requests | `buildMergeRequest` tracks source/target branches, discussions, reviews, and mergeability. |
| In-browser editors and diffs | `buildEditorCapabilities` and `buildDiffPlan` map file types to editor/diff modes. |
| Computation-aware reproducibility | `buildReproducibilityReport` checks raw data, code, environment, sandbox, commands, and expected outputs. |
| DOI and citation | `buildCitationRecord` generates DOI version metadata and APA/BibTeX strings. |
| Export metadata | `buildRepositoryExport` creates archive metadata, schema.org payload, and citation badge data. |
