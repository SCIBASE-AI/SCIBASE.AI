# Enterprise IRB Consent Governance

This module adds an Enterprise Tooling slice for institutional review and human-subjects research governance. It is self-contained, dependency-free, and uses synthetic project data only.

It evaluates whether projects can be exported, published, or synced to institutional systems when they include human participants, controlled data, or consent-limited datasets.

## What it checks

- IRB approval presence, status, and expiry.
- Consent scope coverage for each data-use purpose.
- Guardian consent for minor participants.
- De-identification requirements before external export.
- Data-use agreement coverage for PHI, genomic, and private clinical data.
- Export destination restrictions and jurisdiction limits.
- Retention and deletion clock violations.
- Signed webhook-ready governance events for institutional audit systems.

## Files

- `index.js` - governance evaluator and packet generator.
- `sample-data.js` - synthetic institutional policy and project samples.
- `test.js` - deterministic unit tests.
- `demo.js` - writes reviewer artifacts and a short MP4 demo when `ffmpeg` is available.
- `requirements-map.md` - maps the module to issue #19 requirements.
- `acceptance-notes.md` - reviewer notes and scope boundaries.

## Run

```bash
node enterprise-irb-consent-governance/test.js
node enterprise-irb-consent-governance/demo.js
```

The demo writes:

- `irb-consent-report.json`
- `reviewer-packet.md`
- `demo.svg`
- `demo.mp4` when `ffmpeg` is available
