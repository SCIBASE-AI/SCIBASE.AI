# Challenge Onboarding Clock Parity Guard

Challenge: Wet-lab modeling bounty onboarding
Status: HOLD
Fingerprint: 9f4574ea48b7b85b
Recommended clock start: not ready

## Summary

Onboarding clock is hold with 3 critical, 5 high, and 2 warning finding(s).

## Team Readiness

- team-alpha: readyAt=2026-06-03T14:00:00.000Z, tools=ready, support=ready
- team-beta: readyAt=2026-06-03T15:35:00.000Z, tools=missing, support=missing
- team-gamma: readyAt=missing, tools=ready, support=ready

## Findings

- CRITICAL CLOCK_START_BEFORE_ALL_TEAMS_READY: The proposed submission clock starts before every accepted team is workspace-ready.
  - Remediation: Move the clock start to the latest ready timestamp plus any published buffer.
- CRITICAL WORKSPACE_NOT_READY: team-gamma has no ready workspace timestamp.
  - Remediation: Provision the workspace and record the ready timestamp before starting the clock.
- CRITICAL WORKSPACE_READY_AFTER_CLOCK_START: team-beta became workspace-ready after the proposed submission clock start.
  - Remediation: Delay the submission clock until this workspace and all peers are ready.
- HIGH COMPUTE_QUOTA_BELOW_BASELINE: team-beta has less compute quota than the published onboarding baseline.
  - Remediation: Top up compute quota before opening the submission clock.
- HIGH REQUIRED_TOOL_ACCESS_MISSING: team-beta is missing one or more required tools before clock start.
  - Remediation: Grant all required tools before starting or resuming the submission clock.
- HIGH STARTER_KIT_CHECKSUM_MISMATCH: team-beta received a starter kit checksum that does not match the canonical kit.
  - Remediation: Re-issue the canonical starter kit and refresh the checksum evidence.
- HIGH SUPPORT_CHANNEL_VISIBILITY_MISSING: team-beta cannot see every required support channel.
  - Remediation: Add the team to all required support channels before clock start.
- HIGH WORKSPACE_TEMPLATE_MISMATCH: team-beta received template workspace-template-2026.05 instead of workspace-template-2026.06.
  - Remediation: Rebuild the workspace from the canonical challenge template.
- WARNING SETUP_BLOCKER_RESPONSE_AFTER_CLOCK_START: team-beta still had a setup blocker when the proposed clock started.
  - Remediation: Pause or delay the clock until setup blockers receive an actionable response.
- WARNING UNAPPROVED_EXTRA_TOOL_ACCESS: team-alpha has extra tool access not listed in the canonical onboarding plan.
  - Remediation: Approve the extra tools as non-material or normalize tool access across teams.
