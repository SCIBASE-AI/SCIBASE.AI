# Acceptance Notes

## Validation

Run locally from the repository root:

```bash
node researcher-profile-reputation-sync/test.js
node researcher-profile-reputation-sync/demo.js
node --check researcher-profile-reputation-sync/index.js
node --check researcher-profile-reputation-sync/test.js
node --check researcher-profile-reputation-sync/demo.js
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height -of default=noprint_wrappers=1 researcher-profile-reputation-sync/demo.mp4
git diff --check
```

## Acceptance Criteria Covered

- Ready public profile satisfies verified email, canonical ORCID, fresh ORCID sync, verified primary affiliation, verified grant evidence, safe activity feed, fresh reputation metrics, and sufficient reproducibility score.
- Audit digests are deterministic for identical input.
- Stale ORCID sync, unverified primary affiliation, low reproducibility score, stale reputation metrics, and unverified email produce held status.
- Private project activity leaks and public non-publication activity on private profiles produce held status.
- Anonymous review mode suppresses display name and flags missing escrow plus identity hints.
- Missing user id, invalid profile mode, invalid ORCID format, missing affiliation institution, and invalid reproducibility score produce blocked status.
- Invalid negative integer reputation metrics throw before reporting.

## Reviewer Notes

This slice is intentionally narrow. It focuses on researcher profile reputation and visibility sync and does not duplicate workspace access ledgers, identity recovery, anonymous review escrow, institutional recertification, project member lifecycle governance, or data-room consent controls already submitted to the issue.
