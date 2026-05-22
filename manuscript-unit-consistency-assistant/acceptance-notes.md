# Acceptance Notes

## What Changed

- Added a self-contained manuscript unit consistency assistant.
- Added synthetic sample data that demonstrates missing units, molar-vs-mass concentration conflicts, table unit drift, and implausible temperature detection.
- Added deterministic tests and demo artifacts for local review.

## Verification Targets

- The module runs with Node.js and no third-party dependencies.
- Findings include stable IDs, evidence snippets, recommendations, and severity.
- Reports are deterministic across repeated runs.
- Clean sample manuscripts return a 100 readiness score with no findings.
- The included demo video is H.264, 1280x720, and 4 seconds long.

## Local Validation

```bash
npm --prefix manuscript-unit-consistency-assistant run check
npm --prefix manuscript-unit-consistency-assistant test
npm --prefix manuscript-unit-consistency-assistant run demo
node manuscript-unit-consistency-assistant/test.js
node manuscript-unit-consistency-assistant/demo.js
node --check manuscript-unit-consistency-assistant/index.js
node --check manuscript-unit-consistency-assistant/sample-data.js
node --check manuscript-unit-consistency-assistant/test.js
node --check manuscript-unit-consistency-assistant/demo.js
git diff --check
mdls -name kMDItemDurationSeconds -name kMDItemCodecs -name kMDItemPixelHeight -name kMDItemPixelWidth manuscript-unit-consistency-assistant/reports/demo.mp4
```
