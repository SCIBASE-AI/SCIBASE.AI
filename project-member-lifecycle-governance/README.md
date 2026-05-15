# Project Member Lifecycle Governance

Standalone SCIBASE module for the User & Project Management bounty.

The module focuses on a narrow operational problem that sits inside user/project management: when researchers leave, projects need owner continuity, object-level grant cleanup, invitation cleanup, and reviewable audit evidence.

## What it covers

- Linked identity and MFA posture scoring.
- Departing/inactive member detection.
- Owner handoff plans for projects that would lose continuity.
- Sensitive grant revocations for datasets, notebooks, billing exports, and review approvals.
- Stale invitation cleanup, including external collaborator and departing-sponsor cases.
- Object owner transfer or quarantine when no replacement is available.
- Deterministic audit digests for reviewer evidence.

## Run locally

```bash
npm run check
npm test
npm run demo
```

The demo writes:

- `docs/demo-output.json`
- `docs/demo.svg`
- `docs/demo.mp4` after rendering the SVG into the submitted video artifact

## Core API

```js
const { evaluateWorkspace } = require("./src/member-lifecycle");

const evaluation = evaluateWorkspace(workspace, {
  now: "2026-05-15T00:00:00.000Z"
});
```

## Why this is distinct

Existing submissions on this issue cover broad identity/RBAC or access-review surfaces. This contribution targets the project lifecycle edge cases that can quietly break research continuity: departing owners, sensitive grants, stale invitations, orphaned datasets, and audit evidence for handoff decisions.
