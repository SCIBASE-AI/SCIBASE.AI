# Repository Embargo Release Guard Report

Batch: embargo-release-2026-05-29
Release date: 2026-05-29

## Summary

- Assets evaluated: 4
- Release ready: 2
- Held: 2
- Findings: 5

## Decisions

### asset-1

- Path: data/protein-folds-public.csv
- Decision: release-ready
- Findings: none
- Actions: include asset in tagged release; publish citation/export metadata

### asset-2

- Path: manuscript/sponsor-results.md
- Decision: hold-release
- Findings: embargo active until 2026-08-15; public access group assigned before embargo expiry
- Actions: hold asset from public release; repair embargo metadata; exclude from export bundle until clean

### asset-3

- Path: results/funder-required-summary.md
- Decision: release-ready
- Findings: none
- Actions: include asset in tagged release; publish citation/export metadata

### asset-4

- Path: data/clinical-derived.tsv
- Decision: hold-release
- Findings: expired embargo still lacks public access group; DOI target does not match export bundle target; citation badge hidden after embargo expiry
- Actions: hold asset from public release; repair embargo metadata; exclude from export bundle until clean
