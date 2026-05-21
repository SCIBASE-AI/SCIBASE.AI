# Institutional Account Transfer Revenue Guard Report

Generated transfers: 4
Approved: 1
Conditional: 1
Held: 2
Net transfer invoice cents: 68388
Held compute credits: 9400
Audit digest: `9ce0c3013f4cd71381f0b359a694a99fff2e7deb6aef91680063c97528bbd848`

## Transfer Decisions

### TR-OK-001: Lab account transfer to central university tenant
- Status: approve
- Source: North Campus Neuro Lab
- Target: North Example University
- Risk score: 3.1
- Blockers: none
- Warnings: none
- Adjustments: none
- Finance actions: POST_TRANSFER_PRORATION

### TR-HOLD-002: Transfer from grant lab to commercial spinout
- Status: hold
- Source: Genome Grant Lab
- Target: Genome Spinout Inc
- Risk score: 178.1
- Blockers: OUTSTANDING_INVOICE_HOLD, PO_TRANSFER_AUTHORITY_MISSING, SSO_DOMAIN_TRANSFER_UNVERIFIED, LICENSE_SCOPE_NOT_TRANSFERABLE, COMPUTE_CREDIT_NOT_TRANSFERABLE
- Warnings: none
- Adjustments: none
- Finance actions: RESOLVE_OUTSTANDING_INVOICE_HOLD, RESOLVE_PO_TRANSFER_AUTHORITY_MISSING, RESOLVE_SSO_DOMAIN_TRANSFER_UNVERIFIED, RESOLVE_LICENSE_SCOPE_NOT_TRANSFERABLE, RESOLVE_COMPUTE_CREDIT_NOT_TRANSFERABLE, POST_TRANSFER_PRORATION

### TR-COND-003: Consortium member transfer with discount reset
- Status: conditional
- Source: Eastern Bioinformatics Center
- Target: Metro Research Hospital
- Risk score: 28.65
- Blockers: none
- Warnings: SSO_DOMAIN_CHANGED, COMPUTE_CREDIT_EXPIRING_SOON
- Adjustments: CONSORTIUM_DISCOUNT_REDUCED
- Finance actions: REVIEW_SSO_DOMAIN_CHANGED, APPLY_CONSORTIUM_DISCOUNT_REDUCED, REVIEW_COMPUTE_CREDIT_EXPIRING_SOON, POST_TRANSFER_PRORATION

### TR-HOLD-004: Compute-credit grant ownership mismatch
- Status: hold
- Source: Microbiome Methods Lab
- Target: Shared Core Facility
- Risk score: 45
- Blockers: COMPUTE_CREDIT_OWNERSHIP_MISMATCH
- Warnings: SSO_DOMAIN_CHANGED
- Adjustments: none
- Finance actions: REVIEW_SSO_DOMAIN_CHANGED, RESOLVE_COMPUTE_CREDIT_OWNERSHIP_MISMATCH
