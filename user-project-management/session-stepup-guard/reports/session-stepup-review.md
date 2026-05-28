# Project Session Step-Up Review

Decision: deny-until-step-up
Risk score: 100
Action: restricted-data-export
Session digest: bb45b20f6b133718
Audit digest: 2c562795f582ba24

## Findings
- [blocker] Sensitive project action lacks fresh MFA or passkey evidence: restricted-data-export on dataset/raw-neuro-export has MFA age 993 minutes and passkey age Infinity minutes.
  Action: Require fresh MFA/passkey verification before allowing the action.
- [high] Sensitive action originates from an untrusted device: Device device-new-browser-9 is not remembered/trusted for user-research-admin-17.
  Action: Hold the action until the user completes device verification or uses a known managed device.
- [medium] New device is attempting a sensitive project action: Device first seen 0.1 days ago.
  Action: Require owner notification and step-up before granting project changes from a new device.
- [high] Session geography is inconsistent with recent access: Austin, US to Frankfurt, DE: 7300 km in 1.3 hours.
  Action: Require step-up verification, revoke remembered-device trust, and notify project owners.
- [high] Session is too old or idle for the requested action: Session age 16.6 hours; idle 115 minutes.
  Action: Refresh the session and rerun permission evaluation before project state changes.
- [high] Project policy requires a managed device: project-restricted-neuro-42 requires managed-device posture for restricted project actions.
  Action: Use a managed device or request an explicit data-steward exception.
- [medium] Restricted project action lacks hardware-key enrollment: user-research-admin-17 has no hardware-key enrollment for restricted-human-subjects.
  Action: Enroll a hardware key before persistent elevated project administration.

## Safety
- Synthetic user/session/project packet only; no live identity-provider calls.
