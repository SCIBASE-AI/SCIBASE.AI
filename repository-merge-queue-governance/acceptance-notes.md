# Acceptance Notes

## Validation

Run locally from the repository root:

```bash
node repository-merge-queue-governance/test.js
node repository-merge-queue-governance/demo.js
node --check repository-merge-queue-governance/index.js
node --check repository-merge-queue-governance/test.js
node --check repository-merge-queue-governance/demo.js
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height -of default=noprint_wrappers=1 repository-merge-queue-governance/demo.mp4
git diff --check
```

## Acceptance Criteria Covered

- Ready merge request satisfies branch references, attribution, reviewer approvals, reproducibility evidence, large-file routing, content hashes, generated-output digests, and citation impact notes.
- Audit digests are deterministic for identical input.
- Self-approval and missing required reviewer roles produce held status.
- Stale base branches, unresolved threads, missing fork attribution, and failed reproducibility evidence produce held status.
- Large files without LFS, generated outputs without generator digests, and files without content hashes produce held status.
- Missing merge request id, branch references, author attribution, file paths, and valid file sizes produce blocked status.

## Reviewer Notes

This slice is intentionally narrow. It focuses on merge queue readiness for scientific branches and does not duplicate broad repository ledgers, dataset diff engines, notebook replay ledgers, release embargo controls, schema migration ledgers, citation impact gates, or API/export contract verifiers already submitted to the issue.
