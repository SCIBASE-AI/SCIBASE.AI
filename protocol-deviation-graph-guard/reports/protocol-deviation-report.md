# Protocol Deviation Graph Guard Report

Generated: 2026-06-01T15:45:00.000Z
Decision: hold-unsafe-graph-edges

## Totals

- Experiments audited: 2
- Findings: 7
- Hold edges: 3
- Review edges: 0
- Publish edges: 2

## Experiment Decisions

### experiment:organoid-run-2026-05-18

- Protocol: protocol:crispr-neuro-042
- Risk score: 0
- Decision: publish
- Edge actions: followed-protocol:publish, supports-concept:publish
- Findings: none

### experiment:organoid-run-2026-05-29

- Protocol: protocol:crispr-neuro-042
- Risk score: 100
- Decision: hold
- Edge actions: followed-protocol:hold, supports-concept:hold, eligible-for-recommendation:hold
- [high] protocol-version-mismatch: experiment used 2.0.0, current protocol is 2.1.0
- [high] instrument-calibration-expired: sequencer:mini-ion-17 calibration expired 4 days before run
- [high] unauthorized-reagent-lot: CAS9-Z99 is not approved for protocol:crispr-neuro-042
- [critical] parameter-out-of-tolerance: minOnTargetScore=71 deviates from 82 by 11, tolerance 3
- [critical] parameter-out-of-tolerance: hours=61 deviates from 48 by 13, tolerance 4
- [critical] parameter-out-of-tolerance: temperatureC=39.1 deviates from 37 by 2.1000000000000014, tolerance 0.5
- [critical] missing-required-step: Amplicon sequencing QC was not observed

Synthetic data only. No private research data, payment systems, live graph services, or external APIs are used.
