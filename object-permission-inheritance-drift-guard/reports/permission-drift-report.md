# Object Permission Inheritance Drift Guard Report

Projects reviewed: 2
Ready projects: 1
Blocked projects: 1
Objects reviewed: 5
Sensitive objects: 4
Critical findings: 3
Warning findings: 3
Audit digest: `cf7e0ed51584b91a6be77038b45379f2ab9c547f77001a14dfecf89f2ff1b865`

## Project Decisions

### Oncology Collaboration Workspace
- Status: permission_change_blocked
- Objects: 3
- Sensitive objects: 3
- Finding codes: inherited_grant_overexposure, data_steward_approval_present, object_override_completeness, inherited_grant_overexposure, stale_object_override, object_override_completeness

### Materials Open Methods Workspace
- Status: permission_change_ready
- Objects: 2
- Sensitive objects: 1
- Finding codes: none

## Remediation Queue
- oncology-collab/dataset-rna-human: narrow_inherited_role_or_add_explicit_deny (critical)
- oncology-collab/dataset-rna-human: collect_data_steward_approval (critical)
- oncology-collab/dataset-rna-human: add_explicit_object_override_decision (warning)
- oncology-collab/thread-blinded-review: narrow_inherited_role_or_add_explicit_deny (critical)
- oncology-collab/thread-blinded-review: recertify_or_expire_object_override (warning)
- oncology-collab/thread-blinded-review: add_explicit_object_override_decision (warning)
