# Enterprise SSO Certificate Rollover Review

Generated: 2026-06-01T00:00:00.000Z
Decision: block_metadata_release
Audit digest: ccab61ff4ae3d58c244abd793cdafa209c0dfd6a6ae9e06bb01a629f43bc17d2

## Summary

- Tenants reviewed: 4
- Critical findings: 8
- Warning findings: 11
- Clear: 1
- Rotate before expiry: 0
- Hold rollover: 2
- Block metadata release: 1

## Tenant Decisions

| Tenant | Status | Critical | Warnings |
| --- | --- | ---: | ---: |
| Tokyo Molecular Imaging Lab | clear | 0 | 0 |
| Kyoto Research Office | hold_rollover | 1 | 4 |
| National Materials Consortium | block_metadata_release | 5 | 5 |
| Oceanic BioCore Institute | hold_rollover | 2 | 2 |

## Findings

### CRITICAL: primary_certificate_expires_during_freeze

Tenant: Kyoto Research Office

The primary signing certificate expires inside the hard rollover freeze window.

Remediation: Stage and test replacement metadata immediately, then hold release until overlap and fallback checks pass.

Evidence: `{"certId":"kyoto-2026","expiresInDays":12,"notAfter":"2026-06-13T00:00:00.000Z"}`

### WARNING: short_lived_staged_certificate

Tenant: Kyoto Research Office

The staged certificate expires too soon after the current primary certificate.

Remediation: Use replacement signing material with enough future validity to avoid a second near-term rollover.

Evidence: `{"primaryCertId":"kyoto-2026","stagedCertId":"kyoto-2027","stagedExpiresAfterPrimaryDays":341}`

### WARNING: stale_fallback_login_test

Tenant: Kyoto Research Office

Emergency fallback-login evidence is stale for this SSO rollover.

Remediation: Retest emergency admin access before changing identity-provider metadata.

Evidence: `{"fallbackAgeDays":31,"fallbackLoginTestedAt":"2026-05-01T00:00:00.000Z"}`

### WARNING: stale_metadata_fetch_evidence

Tenant: Kyoto Research Office

IdP metadata fetch evidence is older than the freshness policy.

Remediation: Refresh IdP metadata and rerun the guard before release.

Evidence: `{"lastFetchedAt":"2026-05-20T00:00:00.000Z","metadataAgeDays":12}`

### WARNING: connected_system_stale_refresh

Tenant: Kyoto Research Office

A connected enterprise system has stale metadata refresh evidence.

Remediation: Refresh metadata for the connected system before the rollover release window.

Evidence: `{"lastMetadataRefreshAt":"2026-05-15T00:00:00.000Z","refreshAgeDays":17,"system":"Invenio institutional archive"}`

### CRITICAL: primary_certificate_expires_during_freeze

Tenant: National Materials Consortium

The primary signing certificate expires inside the hard rollover freeze window.

Remediation: Stage and test replacement metadata immediately, then hold release until overlap and fallback checks pass.

Evidence: `{"certId":"materials-legacy","expiresInDays":4,"notAfter":"2026-06-05T00:00:00.000Z"}`

### CRITICAL: unsafe_signing_algorithm

Tenant: National Materials Consortium

The signing certificate metadata uses an unsupported or weak algorithm.

Remediation: Use RSA-SHA256 or stronger, or ECDSA-SHA256 or stronger, before release.

Evidence: `{"algorithm":"RSA-SHA1","certId":"materials-legacy"}`

### CRITICAL: weak_rsa_key_size

Tenant: National Materials Consortium

The signing certificate has an RSA key below the minimum enterprise size.

Remediation: Regenerate signing material with a 2048-bit or stronger RSA key.

Evidence: `{"certId":"materials-legacy","keySize":1024}`

### WARNING: unverifiable_certificate_fingerprint

Tenant: National Materials Consortium

The certificate fingerprint is not recorded as a SHA-256 digest.

Remediation: Store a SHA-256 fingerprint so reviewers can compare metadata without handling raw certificates.

Evidence: `{"certId":"materials-legacy","fingerprint":"sha1:legacy-materials-fingerprint"}`

### WARNING: missing_rollover_owner_or_ticket

Tenant: National Materials Consortium

The rollover plan is missing an owner or release ticket.

Remediation: Assign an accountable enterprise admin and reference the release ticket before metadata changes.

Evidence: `{"owner":null,"ticketId":null}`

### CRITICAL: missing_staged_rollover_certificate

Tenant: National Materials Consortium

The tenant is in the rotation window but has no staged replacement certificate.

Remediation: Stage a replacement signing certificate and publish dual-cert metadata for the overlap period.

Evidence: `{"expiresInDays":4,"notifyBeforeDays":60,"primaryCertId":"materials-legacy"}`

### WARNING: missing_fallback_login_test

Tenant: National Materials Consortium

No emergency fallback-login test is attached to the rollover plan.

Remediation: Attach a recent break-glass login test before release.

Evidence: `{"rolloverTicket":null}`

### WARNING: stale_metadata_fetch_evidence

Tenant: National Materials Consortium

IdP metadata fetch evidence is older than the freshness policy.

Remediation: Refresh IdP metadata and rerun the guard before release.

Evidence: `{"lastFetchedAt":"2026-04-24T00:00:00.000Z","metadataAgeDays":38}`

### CRITICAL: entity_id_drift

Tenant: National Materials Consortium

The IdP entity ID differs from the expected enterprise SSO entity ID.

Remediation: Pause release and reconcile the IdP metadata source with the enterprise SSO configuration.

Evidence: `{"expectedEntityId":"https://idp.materials-consortium.example/saml","metadataEntityId":"https://idp.materials-consortium.example/legacy"}`

### WARNING: connected_system_stale_refresh

Tenant: National Materials Consortium

A connected enterprise system has stale metadata refresh evidence.

Remediation: Refresh metadata for the connected system before the rollover release window.

Evidence: `{"lastMetadataRefreshAt":"2026-04-30T00:00:00.000Z","refreshAgeDays":32,"system":"Lab inventory bridge"}`

### WARNING: primary_certificate_rotation_due

Tenant: Oceanic BioCore Institute

The primary signing certificate is inside the recommended rotation notice window.

Remediation: Notify admins and complete the staged rollover before the hard freeze window begins.

Evidence: `{"certId":"oceanic-2026","expiresInDays":30,"notAfter":"2026-07-01T00:00:00.000Z"}`

### CRITICAL: insufficient_certificate_overlap

Tenant: Oceanic BioCore Institute

The staged certificate does not overlap the primary certificate long enough.

Remediation: Publish staged metadata early enough to provide the required overlap before the primary certificate expires.

Evidence: `{"overlapRequiredDays":21,"primaryCertId":"oceanic-2026","stagedActiveBeforeExpiryDays":6,"stagedCertId":"oceanic-2027"}`

### WARNING: short_lived_staged_certificate

Tenant: Oceanic BioCore Institute

The staged certificate expires too soon after the current primary certificate.

Remediation: Use replacement signing material with enough future validity to avoid a second near-term rollover.

Evidence: `{"primaryCertId":"oceanic-2026","stagedCertId":"oceanic-2027","stagedExpiresAfterPrimaryDays":359}`

### CRITICAL: acs_url_drift

Tenant: Oceanic BioCore Institute

The IdP ACS URL differs from the expected enterprise SSO ACS URL.

Remediation: Pause release until ACS URL drift is resolved and tested with a non-production login.

Evidence: `{"expectedAcsUrl":"https://scibase.example/saml/acs/oceanic-biocore","metadataAcsUrl":"https://scibase.example/saml/acs/oceanic-biocore-v2"}`

