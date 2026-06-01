# Protocol Deviation Graph Guard

Synthetic, dependency-free review module for SCIBASE issue #17, focused on experiment-to-protocol adherence before knowledge graph edges and recommendations are published.

The guard audits protocol packets for:

- missing required protocol steps;
- protocol version mismatches;
- unauthorized reagent lots;
- expired instrument calibration;
- parameter deviations outside declared tolerances;
- graph edge publish/review/hold decisions.

It emits JSON, Markdown, SVG, GIF, and MP4 reviewer artifacts from synthetic data only. No credentials, private studies, live graph services, payment systems, or external APIs are used.

## Commands

```bash
npm test
npm run demo
npm run demo:video
```

Generated artifacts are written to `reports/`.
