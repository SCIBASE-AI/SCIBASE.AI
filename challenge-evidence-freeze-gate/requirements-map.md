# Requirements Map

Source: SCIBASE.AI issue #18, Scientific Bounty System.

| Requirement | Implementation |
| --- | --- |
| Submission engine | Frozen and current solver submission packets are modeled with artifact manifests. |
| Version control and audit logs | `manifestHash`, artifact checksums, timestamps, and deterministic audit digests record submission history. |
| Built-in submission package builder | Artifact manifests include model, notebook, whitepaper, and result package metadata. |
| Multi-phase challenge support | The gate sits between deadline close and review/arbitration scoring. |
| Automated deliverable checklists | `compareSubmissions()` checks late additions, removals, checksum drift, metric drift, and metadata drift. |
| Arbitration workflow | `arbitrationPacket` emits exclusions, reviewer tasks, public exception notes, and hold decisions. |
| Escrowed prize and payout readiness | Blocking diffs produce `hold-evaluation-and-payout` before reward or settlement. |
| IP transfer guard | Artifacts retain solver-owned licensing until clean evaluation and payout readiness. |
| Sponsor/reviewer transparency | Exception justifications are captured as reviewer-visible notes. |
| Reviewer-facing artifacts | Demo emits JSON, Markdown, SVG, and MP4 artifacts under `reports/`. |
| Local verification | `test.js` covers checksum drift, metric drift, late primary artifacts, missing justifications, clean packet behavior, digest stability, Markdown output, and SVG output. |
