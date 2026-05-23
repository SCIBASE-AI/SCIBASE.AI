# Object Permission Inheritance Drift Guard

Self-contained guard for SCIBASE issue #11. The module evaluates project role and object-level permission changes before they are applied, with a focus on inherited grants that can silently overexpose sensitive research objects.

## Scope

- Detects inherited project-role grants that overexpose restricted datasets, notebooks, manuscripts, or review threads.
- Flags stale object-level allow overrides that need recertification.
- Requires data-steward approval for pending sensitive object actions.
- Finds restricted inherited actions without explicit object-level override decisions.
- Produces remediation queues and deterministic JSON, Markdown, SVG, and MP4 review artifacts.

## Local Validation

```bash
npm run check
npm test
npm run demo
```

Generated artifacts are written to `reports/`.

## Integration Shape

`evaluateObjectPermissionInheritanceDrift()` accepts project packets with:

- `roles`
- `members`
- `objects`
- `objectOverrides`
- `stewardApprovals`
- `pendingPermissionChanges`

It returns project statuses:

- `permission_change_ready`
- `permission_review_required`
- `permission_change_blocked`

The output also includes a remediation queue, ready queue, effective grant summaries, and SHA-256 audit digest.
