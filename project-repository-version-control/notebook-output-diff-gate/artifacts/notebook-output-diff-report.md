# Notebook Output Diff Gate

## Summary

- Notebook diffs reviewed: 4
- Ready: 2
- Blocked: 2
- Findings: 5

## Reports

### repo-clean-analysis

- Notebook: notebooks/analysis.ipynb
- Commit: abc1234
- Decision: ready
- Changed cells: 1

### repo-stale-output

- Notebook: notebooks/figures.ipynb
- Commit: def5678
- Decision: block
- Changed cells: 1
  - block: stale_output_change - cell-figure changes notebook output without code/input changes or an execution record.
  - hold: large_output_without_evidence - cell-figure changes 143000 output bytes without reviewer evidence.

### repo-missing-run

- Notebook: notebooks/model.ipynb
- Commit: 987abcd
- Decision: block
- Changed cells: 1
  - block: missing_execution_record - cell-model changes executable content without a recorded run.
  - block: missing_environment_fingerprint - cell-model depends on an environment change, but no environment fingerprint is present.

### repo-noisy-digest

- Notebook: notebooks/supplement.ipynb
- Commit: 456efgh
- Decision: ready
- Changed cells: 1
  - hold: unchanged_output_digest - cell-supplement reports an output change but output digests are identical.

