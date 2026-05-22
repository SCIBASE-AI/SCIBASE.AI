# Issue #18 Requirement Map

## Secure Submission Engine

- Preserves workspace continuity when a solver withdraws after private challenge access starts.
- Checks workspace revocation, team quorum, replacement readiness, and artifact custody before work continues.
- Keeps withdrawal handling separate from challenge intake, broad scoring, and final payout settlement.

## Multi-Phase Challenges

- Flags milestone deadlines within seven days of a withdrawal event.
- Creates coordinator actions for extension review, partial-credit handling, and sponsor/reviewer notifications.
- Supports replacement members who meet eligibility and NDA requirements.

## Arbitration And Reward Distribution

- Holds challenge continuity when team quorum, access revocation, or notice evidence is missing.
- Preserves audit evidence for later arbitration if a withdrawal affects scoring, compensation, or IP custody.
- Prevents sponsor review or payout handoff from continuing while withdrawn solver artifacts lack custody confirmation.

## IP Management Options

- Requires IP return, retention, or destruction confirmation for withdrawing solvers.
- Tracks artifact ownership by solver and confirms custody before sponsor/reviewer packets continue.

## Review Evidence

- `test.js` covers workspace hold, coordinator review, and continuity-ready outcomes.
- `demo.js` generates deterministic JSON, Markdown, SVG, and MP4 artifacts from synthetic data.
- No live challenge workspace, payment, KYC, bank, payout, sponsor data-room, or external account systems are used.
