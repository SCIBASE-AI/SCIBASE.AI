# Dependency Advisory SBOM Guard

This module is a focused Scientific/Engineering Data & Code Hosting slice for
SCIBASE.AI issue #14. It evaluates hosted code and notebook artifacts before
metadata previews, reproduce buttons, scheduled reruns, or export bundles are
enabled.

The implementation is self-contained and synthetic-data-only. It does not call
package registries, vulnerability scanners, external SBOM services, execution
sandboxes, or live project systems.

## Coverage

- Matches SBOM components against local synthetic advisory metadata.
- Supports deterministic semver-like advisory ranges such as `<2.2.2` and
  `>=2.0.0 <2.2.2`.
- Checks lockfile/SBOM freshness before execution surfaces are enabled.
- Quarantines executable previews, reproduce buttons, scheduled reruns, and
  export bundles when critical/high runtime advisories match.
- Distinguishes runtime, notebook, model-serving, production, and dev scopes.
- Produces reviewer remediation actions and deterministic audit digests.
- Keeps metadata-only review possible while unsafe executable surfaces are held.

## Local Validation

```bash
npm run check
npm test
npm run demo
```

The demo writes:

- `reports/dependency-advisory-packet.json`
- `reports/dependency-advisory-report.md`
- `reports/summary.svg`
- `reports/demo.mp4`

## Bounty Non-Overlap

This is not another FAIR manifest, artifact access gate, package integrity
checker, executable environment drift module, provenance chain, quarantine/rerun
module, storage quota ledger, preview cache guard, raw-instrument preview gate,
notebook preview checker, retention/tombstone ledger, model-card lineage gate,
license compatibility gate, sensitive-file redaction gate, dataset schema
evolution gate, data dictionary release gate, or persistent identifier guard. It
focuses specifically on dependency advisory and SBOM risk before hosted
scientific code or notebooks can execute or export.
