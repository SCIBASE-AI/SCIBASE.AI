# Enterprise Export Maintenance Guard Report

- Job: funder-portal-held
- Destination: horizon-eu-portal
- Destination type: funder
- Decision: HOLD
- Audit digest: 3aac7e7788d1480d

## Findings

- HIGH ACTIVE_DESTINATION_MAINTENANCE: horizon-eu-portal is in maintenance: grant portal database failover.
  Remediation: Defer export for at least 130 minutes or route to a safe queue.
- MEDIUM INSTITUTIONAL_BLACKOUT_WINDOW: Institutional blackout is active: institutional grant-office freeze.
  Remediation: Wait for the institutional export freeze to end or obtain explicit admin override evidence.
- MEDIUM STALE_DESTINATION_STATUS_EVIDENCE: Status evidence is 30.3 hours old.
  Remediation: Refresh destination health evidence before exporting to institutional systems.
- HIGH DEGRADED_DESTINATION_HEALTH: horizon-eu-portal health is degraded.
  Remediation: Hold embargo-sensitive exports or queue non-sensitive exports until destination health recovers.
- MEDIUM MISSING_OWNER_ACKNOWLEDGEMENT: Export owner has not acknowledged destination timing risk.
  Remediation: Collect owner acknowledgement before pushing to the external destination.
- MEDIUM RETRY_WINDOW_EXCEEDS_POLICY: Retry-after 90m exceeds allowed delay 20m.
  Remediation: Reschedule the job rather than relying on automatic retries beyond policy.
