# Data fabrication anomaly review: Cytokine response claims from a disputed assay batch

Decision: **HOLD**
Audit digest: `6466f6cc655b23a7`

## Findings

- **HIGH** Repeated measurement rows need raw-data verification (duplicate-measurement-rows)
  Evidence: 1 duplicate row pair(s): #12/#13
  Action: Hold AI review output until source instruments, audit trail, and import logs explain the repeated rows.
- **HIGH** Collection timestamps are not machine-auditable (invalid-collection-timestamps)
  Evidence: Invalid timestamp rows: #14
  Action: Require normalized ISO-8601 collection timestamps before the assistant cites this dataset.
- **MEDIUM** Terminal digit distribution is unusually concentrated (terminal-digit-preference)
  Evidence: 50% of numeric measurements end in 0
  Action: Ask for raw instrument exports or an explanation of rounding rules before trusting fine-grained effects.
- **MEDIUM** Measurement series is smoother than expected for independent observations (over-smooth-measurement-series)
  Evidence: control delta sd/value sd=0
  Action: Route to statistical reviewer for instrument drift, interpolation, or synthetic-row checks.
- **MEDIUM** Groups separate perfectly without overlap (perfect-between-group-separation)
  Evidence: control: n=6, range=10-12.5; treated: n=8, range=20-23
  Action: Require preregistered exclusion rules and raw row provenance before strong causal or classification claims are released.
