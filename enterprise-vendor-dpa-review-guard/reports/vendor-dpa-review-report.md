# Enterprise Vendor DPA Review Guard

Audit digest: `2bc17eb5d5b748a5eb4982642a8ca9af5bdc90e98916182b577073db55edf7cb`

## Status Summary

- approve_vendor: 1
- needs_legal_review: 1
- hold_vendor: 1

## Admin Actions

- Risky Lab AI (hold_vendor): resolve_missing_owner, resolve_dpa_not_active, resolve_region_not_allowed, resolve_missing_baa_for_phi, resolve_missing_dua_for_student_records, resolve_unapproved_subprocessor, resolve_breach_notice_sla_exceeded, resolve_security_review_stale, resolve_subprocessor_region_requires_scc
- Crossborder Notebook (needs_legal_review): resolve_subprocessor_region_requires_scc

## Decisions

- Zenith Archive: approve_vendor; findings=none; digest=7ad1ad454c15ab1532003bda61b5568a249d699725546d4309ad04973ce356e2
- Crossborder Notebook: needs_legal_review; findings=subprocessor_region_requires_scc; digest=cfaac9ba50cfff1eb07bde67207337e8b2da7ef38db13c3204192178e10a5e53
- Risky Lab AI: hold_vendor; findings=missing_owner, dpa_not_active, region_not_allowed, missing_baa_for_phi, missing_dua_for_student_records, unapproved_subprocessor, breach_notice_sla_exceeded, security_review_stale, subprocessor_region_requires_scc; digest=c176a09365c1cd192c881eb6c96b9d73099fad81b4ce397a21edf69b36c1f903
