# Challenge Award Transparency Guard

This module is a focused Scientific Bounty System slice for issue #18. It validates the post-arbitration, pre-publication step before a sponsor announces winners and releases award packets.

The guard checks that:

- final ranks have complete rubric-backed score breakdowns
- reviewer conflict summaries are disclosed and unresolved conflicts hold publication
- every solver team receives the result notice before public announcement
- appeal windows close before payout release
- award totals reconcile to cleared escrow
- IP transfer is gated on payout readiness
- private challenge announcements redact protected solver and artifact details

It uses only Node.js built-ins and synthetic data.

## Run

```bash
node challenge-award-transparency-guard/test.js
node challenge-award-transparency-guard/demo.js
```

The demo writes reviewer artifacts to `challenge-award-transparency-guard/reports/`.
