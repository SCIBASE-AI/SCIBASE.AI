# Clinical Adverse-Event Safety Assistant

Self-contained SCIBASE issue #16 slice for the AI-Powered Research Assistant Suite.
It reviews synthetic clinical manuscript safety packets before reviewer-ready
claims are shown.

## What it checks

- Serious adverse-event counts that are lower in the manuscript than in source data.
- Arm-level Grade 3+ adverse-event imbalance.
- Missing participant denominators on adverse-event rows.
- Exposure-adjusted serious adverse-event incidence gaps.
- Missing DSMB or IRB follow-up links.
- Severity-grade claims that conflict with linked event rows.
- Safety language that downplays unresolved uncertainty.

## Local verification

```bash
node clinical-adverse-event-safety-assistant/test.js
node clinical-adverse-event-safety-assistant/demo.js
python clinical-adverse-event-safety-assistant/make-demo-video.py
```

The demo writes reviewer artifacts to `clinical-adverse-event-safety-assistant/reports/`.
