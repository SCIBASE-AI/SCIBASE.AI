# Requirements Map

| Issue #19 capability | Coverage in this module |
| --- | --- |
| Admin dashboards | Emits clear/review/revoke identity lifecycle decisions for enterprise admins. |
| API and webhooks | Models HRIS/SCIM lifecycle events and downstream connector ownership review. |
| HRIS and ORCID/personnel sync | Reconciles HRIS status against SCIM active state and SCIBASE roles. |
| Institutional repositories | Reviews export connector ownership for repository integrations. |
| Usage stats and compute usage | Flags active compute quota that must be reclaimed or reassigned. |
| Compliance tracking | Produces deterministic audit packets and admin actions for access governance. |

## Non-Overlap Notes

This is an identity lifecycle control. It avoids duplicating existing #19 work
around enterprise API changes, connector certification, secret rotation,
compute quota policy, model governance, funder export, incident response,
dashboard attribution, policy exceptions, IRB consent, initiative tags, and
data export approval queues.
