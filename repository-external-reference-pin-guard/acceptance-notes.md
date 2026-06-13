# Acceptance Notes

## Local Validation

Run from `repository-external-reference-pin-guard/`:

```powershell
npm test
npm run demo
npm run video
npm run check
```

Expected evidence:

- `reports/blocked-packet.json` blocks repository release when external references are floating, authenticated only, stale, missing durable identifiers, or carrying malformed checksum/DOI evidence.
- All-zero Git commit placeholders are treated as unpinned references rather than immutable release evidence.
- Floating version aliases such as `latest` are blocked unless the reference also has checksum or DOI evidence.
- Invalid checksum placeholders such as `pending` do not count as durable identifier or API snapshot evidence and now produce explicit evidence-repair actions.
- Invalid DOI placeholders such as `pending` do not count as durable identifier evidence and now produce explicit evidence-repair actions.
- Truncated checksum values such as `sha256:abcdef` do not count as API snapshot evidence or export metadata even when another identifier is valid.
- Malformed top-level repository packets produce `MALFORMED_REPOSITORY_PACKET` blockers and `repair_repository_packet:*` actions instead of crashing before reviewer packets are generated.
- Malformed object-shaped reference manifests produce `MALFORMED_REFERENCE_MANIFEST` blockers and `repair_reference_manifest:*` actions instead of being treated as empty clean audits.
- Malformed external-reference entries produce `MALFORMED_REFERENCE_ENTRY` blockers and `repair_reference_entry:*` actions instead of crashing or disappearing from reviewer packets.
- Blank or missing reference IDs produce `MISSING_REFERENCE_ID` blockers, stable `unidentified-reference-*` packet IDs, and `assign_reference_id:*` actions instead of releasing ambiguous remediation evidence.
- Missing repository assessment timestamps produce `INVALID_REPOSITORY_ASSESSED_AT` blockers and `repair_repository_assessed_at:*` actions instead of releasing otherwise pinned references without audit timing evidence.
- Authenticated reference targets do not echo embedded credentials or token query values in finding packets.
- Future-dated API snapshots do not count as pinned snapshot evidence for DOI/export release.
- Otherwise pinned references without verification timestamps are blocked until verification evidence is refreshed.
- `reports/warning-packet.json` stages pinned references that still need license and attribution metadata.
- `reports/clean-packet.json` releases a repository with immutable external pins, fresh verification evidence, and exportable metadata.
- `reports/external-reference-report.md` summarizes lanes and finding codes.
- `reports/summary.svg` provides a visual reviewer packet.
- `reports/demo.mp4` is a short H.264 walkthrough generated from synthetic frames.

## Safety Boundaries

All records are synthetic. No external repositories, live APIs, DOI registries, object stores, credentials, private research data, identity providers, or payment systems are contacted.
