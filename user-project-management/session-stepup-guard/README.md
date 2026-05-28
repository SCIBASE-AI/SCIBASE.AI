# Project Session Step-Up Guard

Focused slice for SCIBASE issue #11: a User & Project Management guard that evaluates session and device posture before sensitive project actions are allowed.

## What it checks

- Fresh MFA or passkey evidence for restricted exports, role grants, archive/delete actions, and visibility changes.
- Remembered-device trust, device age, and hardware-key enrollment.
- Impossible-travel and unusual IP/ASN changes across recent project sessions.
- Session age, idle time, and anonymous-review identity escrow constraints.
- Object-level risk so only sensitive actions require step-up.

The module is dependency-free and deterministic. It uses synthetic user/session/project packets only; it does not call identity providers, inspect live projects, or use credentials.

## Validation

```bash
node user-project-management/session-stepup-guard/test.js
node user-project-management/session-stepup-guard/demo.js
node user-project-management/session-stepup-guard/make-demo-video.js
```
