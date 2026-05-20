# Project Service Account Governance Review

Checked at: 2026-05-20T00:00:00.000Z
Overall decision: revoked
Access hold: yes
Audit digest: 7005eed3a40e40e507672fbeb023c90e165508ca91968b95e8558c60cdd24238

## Summary

- Total accounts: 4
- Approved: 1
- Needs rotation: 1
- Suspended: 1
- Revoked: 1
- Blockers: 6
- Warnings: 7

## Account Decisions

| Account | Project | Owner | Decision | Action | Scopes |
| --- | --- | --- | --- | --- | ---: |
| svc-dataset-import | project-protein-folding | user-ada | approved | renew | 3 |
| svc-notebook-ci | project-notebook-release | user-bohr | needs_rotation | rotate_before_renewal | 3 |
| svc-external-sync | project-restricted-cohort | user-curie | suspended | suspend_until_reviewed | 3 |
| svc-legacy-admin | project-legacy-review | user-darwin | revoked | revoke | 3 |

## Reviewer Tasks

- Revoke orphaned or exposed service-account tokens and notify the accountable project owners.
- Suspend privileged or external-export automation until least-privilege scope and data-use evidence are approved.
- Queue token rotation before renewing project automation access.
