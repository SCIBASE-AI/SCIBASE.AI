# Project Access Audit Anomaly Packet

Generated events: 7
Critical: 4; High: 1

## Neuro Alpha Collaboration
- Project: project:neuro-alpha
- Max score: 100
- Export hold: yes
- Summary: Restricted access should be frozen until owner/admin review completes.
- Owner queue:
  - evt:001: critical -> freeze_access_and_open_security_review; MFA not enabled; ORCID not linked for attribution-sensitive event; external collaborator access is expired; restricted object touched; role reviewer is below required admin; new-country access compared with user history; after-hours access
  - evt:002: critical -> freeze_access_and_open_security_review; MFA not enabled; external collaborator access is expired; restricted object touched; role reviewer is below required admin; bulk download count 42 exceeds threshold 10; after-hours access
  - evt:004: high -> require_owner_approval_before_next_download; restricted object touched; object permission drift exposes extra roles: reviewer, contributor

## Materials Sensor Working Group
- Project: project:materials-sensor
- Max score: 100
- Export hold: yes
- Summary: Restricted access should be frozen until owner/admin review completes.
- Owner queue:
  - evt:005: critical -> freeze_access_and_open_security_review; inactive user generated access event; embargoed object touched; restricted-license object exported
  - evt:006: critical -> freeze_access_and_open_security_review; inactive user generated access event; embargoed object touched; new-country access compared with user history

