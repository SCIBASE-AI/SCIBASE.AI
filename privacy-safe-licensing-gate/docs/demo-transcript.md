# Demo Transcript

Command:

```bash
node privacy-safe-licensing-gate/demo.mjs
```

Expected reviewer flow:

1. The report evaluates three sample analytics licensing packages.
2. Two packages are marked `ready` because they use aggregated metadata, satisfy consent and anonymity thresholds, and avoid private content.
3. One package is held because it includes private reviewer notes, a blocked `raw_content` field, low consent coverage, too few subjects, too few institutions, low k-anonymity, and too short an aggregation window.
4. Eligible monthly licensing revenue is counted only for ready packages.
5. Reviewer next actions are summarized so revenue operations can fix unsafe exports before customer delivery.

Expected summary:

```json
{
  "packageCount": 3,
  "readyCount": 2,
  "holdCount": 1,
  "eligibleMonthlyRevenue": 6700
}
```

The demo intentionally uses only sample metadata and does not require payment credentials, private content, customer secrets, network calls, or external services.
