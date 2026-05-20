# Acceptance Notes

## Review Scenarios

1. Visible institutional recommendation
   - A researcher from the matching institution can see a public concept to institutional dataset route.
   - The result includes evidence IDs and a stable audit digest.

2. Embargoed path suppression
   - A non-curator viewer cannot see recommendations that include an embargoed node before the embargo date.
   - The suppressed recommendation includes a clear blocker and curator action.

3. Restricted cohort access
   - A viewer with matching consent, license, and clearance can see restricted cohort recommendations.
   - Missing consent, license, or clearance suppresses the path.

4. Expired embargo review
   - An expired embargo does not hide the recommendation, but it produces a release-metadata warning.

## Validation

```bash
node knowledge-graph-recommendation-visibility-guard/test.js
node knowledge-graph-recommendation-visibility-guard/demo.js
node --check knowledge-graph-recommendation-visibility-guard/index.js
node --check knowledge-graph-recommendation-visibility-guard/test.js
node --check knowledge-graph-recommendation-visibility-guard/demo.js
```

The included `demo.mp4` is a five-second visual walkthrough of the visibility guard flow.
