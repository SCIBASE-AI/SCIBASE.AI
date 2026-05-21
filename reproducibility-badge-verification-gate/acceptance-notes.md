# Acceptance Notes

- Dependency-free Node.js module with deterministic output.
- Synthetic data only; no private identities, credentials, payment data, or external services.
- Badge decisions are `pass`, `revise`, or `hold`.
- `pass` means the requested badge level has enough independent successful reproduction evidence.
- `revise` means evidence may support a lower badge or needs more non-blocking disclosure.
- `hold` means no badge should be issued until blocker findings are fixed.
- Blockers cover conflicted reproducers, missing artifact checksums, environment/output mismatches, failed tests, missing reproducer disclosures, unknown artifacts, unsupported roles, and too few independent runs.
- Demo artifacts are generated locally under `reports/`.
