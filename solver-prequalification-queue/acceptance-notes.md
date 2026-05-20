# Acceptance Notes

## Scope

The module implements a reviewer-ready prequalification queue for scientific bounty solvers. It is self-contained, dependency-free, and uses synthetic sample data only.

## Decisions Demonstrated

- `TEAM-ORCHID` is approved for a private anonymous biotech challenge.
- `TEAM-VECTOR` needs review because expertise and availability are below threshold.
- `TEAM-MERIDIAN` is approved for a named public climate challenge.
- `TEAM-PULSE` is blocked because of sponsor conflict, missing current NDA, identity attestation gap, and active submission load.

## Privacy

Reviewer packets intentionally omit member email addresses and expose only solver aliases, roles, attestation state, NDA version, and a deterministic identity hash.

## Validation

```bash
node solver-prequalification-queue/test.js
node --check solver-prequalification-queue/index.js
node --check solver-prequalification-queue/sample-data.js
node --check solver-prequalification-queue/test.js
node --check solver-prequalification-queue/demo.js
node solver-prequalification-queue/demo.js
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height -of default=noprint_wrappers=1 solver-prequalification-queue/demo.mp4
git diff --check
```
