# Protein binder design bounty

Scenario: risky-challenge

Decision: HOLD

Reviewed 2 communications across 3 eligible teams.

## Findings

- HIGH MATERIAL_AUDIENCE_GAP: Material sponsor communication was not broadcast to every eligible solver team. Affected: team-beta, team-gamma
- HIGH PRIVATE_MATERIAL_HINT: A material hint or rule-affecting message reached only a subset of teams. Affected: team-alpha
- MEDIUM STALE_RULE_DIGEST: Material communication references an outdated rule digest. Affected: team-alpha
- MEDIUM ACCESSIBLE_ATTACHMENT_GAP: Required attachment holdout-hint does not cover recipient accessibility needs. Affected: team-alpha
- LOW UNFAIR_ACK_WINDOW: Acknowledgement window is too short for timezone-safe team parity. Affected: team-alpha
- HIGH MATERIAL_AUDIENCE_GAP: Material sponsor communication was not broadcast to every eligible solver team. Affected: team-gamma
- HIGH PRIVATE_MATERIAL_HINT: A material hint or rule-affecting message reached only a subset of teams. Affected: team-alpha, team-beta
- LOW UNFAIR_ACK_WINDOW: Acknowledgement window is too short for timezone-safe team parity. Affected: team-alpha, team-beta
- MEDIUM MISSING_ACKNOWLEDGEMENT: Material communication lacks acknowledgement from one or more recipient teams. Affected: team-beta

## Release Criteria

- Every material sponsor communication reaches all eligible solver teams.
- Rule-affecting messages reference the current immutable rule digest.
- Delivery channels and required attachments are accessible to each recipient.
- Material acknowledgements use fair windows and are logged before phase transitions.
