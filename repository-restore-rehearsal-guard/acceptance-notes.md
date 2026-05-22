# Acceptance Notes

## Reviewer Path

1. Run `npm run check` to verify syntax.
2. Run `npm test` to verify restore decisions, blockers, clean release behavior, and deterministic audit digests.
3. Run `npm run demo` to regenerate reviewer artifacts in `reports/`.
4. Inspect `reports/restore-rehearsal-report.md` for the release queue and remediation queue.

## Expected Results

- `neuro-reproducibility-atlas` is `restore_ready`.
- `climate-table-fork` is held because restore drill, ref coverage, tag coverage, data checksum, mirror readiness, and environment lock checks fail.
- `protein-model-sandbox` is held because the snapshot/drill/notebook replay evidence is stale and no export manifest is linked.

## Demo Artifacts

- `reports/restore-rehearsal-packet.json`
- `reports/restore-rehearsal-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`
