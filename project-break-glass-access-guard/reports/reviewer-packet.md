# Project Break-Glass Access Guard

As of: 2026-05-22T12:00:00.000Z
Audit digest: `e0e335c11209ce7c1812438f76265bb0adffcfbaee4cc16b489e5d2aebefad03`

## Totals

- Requests evaluated: 5
- Temporary access grants: 3
- Blocked or review requests: 2
- approve_with_review: 1
- approved: 2
- steward_review: 2

## Request Decisions

### bg-001

- Project: project-sepsis-lockdown
- Requester: admin-noor (Admin)
- Status: approve_with_review
- Expires in minutes: 90
- Scopes: manuscript/results:write, discussion/incident:write
- Reasons: after-hours emergency access can proceed with mandatory owner review
- Actions: Grant temporary scoped access; Queue owner review within 24 hours; Auto-expire access and attach audit receipt

### bg-002

- Project: project-sepsis-lockdown
- Requester: viewer-eli (Viewer)
- Status: steward_review
- Expires in minutes: 1440
- Scopes: dataset/raw:download
- Reasons: requester role is not allowed to initiate break-glass access; reason code is not recognized for emergency access; requested scopes are missing or not least-privilege read/write scopes; MFA verification is stale for emergency access; break-glass expiry must be positive and no longer than 120 minutes; immutable audit receipt is missing; post-access review is missing or due more than 24 hours later; request touches protected project data classes; missing owner sponsor approval or after-hours justification
- Actions: Route to steward review before any access is granted; Notify project owner and institutional admin; Require corrected scope, MFA, expiry, evidence, or sponsorship

### bg-003

- Project: project-climate-preprint
- Requester: owner-mei (Owner)
- Status: approved
- Expires in minutes: 60
- Scopes: preprint/submission:write
- Reasons: break-glass request satisfies role, MFA, scope, expiry, evidence, and review gates
- Actions: Grant temporary scoped access; Auto-expire access at requested expiry; Preserve immutable audit receipt and post-access review task

### bg-004

- Project: project-climate-preprint
- Requester: admin-ravi (Admin)
- Status: steward_review
- Expires in minutes: 480
- Scopes: notebooks/final-run:write, results/figures:write
- Reasons: break-glass expiry must be positive and no longer than 120 minutes; post-access review is missing or due more than 24 hours later; request touches protected project data classes
- Actions: Route to steward review before any access is granted; Notify project owner and institutional admin; Require corrected scope, MFA, expiry, evidence, or sponsorship

### bg-005

- Project: project-climate-preprint
- Requester: admin-ravi (Admin)
- Status: approved
- Expires in minutes: 45
- Scopes: notebooks/final-run:write
- Reasons: break-glass request satisfies role, MFA, scope, expiry, evidence, and review gates
- Actions: Grant temporary scoped access; Auto-expire access at requested expiry; Preserve immutable audit receipt and post-access review task
