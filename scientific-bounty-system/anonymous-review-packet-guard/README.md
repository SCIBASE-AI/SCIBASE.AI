# Anonymous Review Packet Guard

This module is a focused Scientific Bounty System slice for issue #18. It validates anonymous challenge review packets before sponsor or reviewer access so solver identity does not leak through metadata, files, notebooks, commits, or access grants.

It checks:

- commit author names and emails
- local file paths, lab folders, and institution references
- notebook outputs containing usernames, paths, or emails
- document author/company/editor metadata
- EXIF GPS, device-owner, and serial metadata
- acknowledgements and team-bio sections
- sponsor/reviewer grants to unredacted packets
- missing redaction receipts
- audit logs that expose identity outside arbitrators

All fixtures are synthetic. The module does not use credentials, private submissions, live challenge data, external APIs, payment rails, or platform secrets.

## Run

```sh
node scientific-bounty-system/anonymous-review-packet-guard/test.js
node scientific-bounty-system/anonymous-review-packet-guard/demo.js
node scientific-bounty-system/anonymous-review-packet-guard/make-demo-video.js
```

The demo writes reviewer artifacts to `reports/`:

- `anonymous-review-packet-audit.json`
- `anonymous-review-packet-audit.md`
- `anonymous-review-packet-summary.svg`
- `demo.mp4`

## Bounty Fit

Issue #18 calls for anonymous or named participation, secure submission workspaces, standardized submission packages, sponsor review, arbitration, and IP-safe release. This guard implements the identity-redaction gate that has to pass before anonymous submissions can be reviewed without compromising solver anonymity or arbitration evidence.
