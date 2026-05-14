# Reputation Abuse and Appeals Guardrails

Self-contained Community & User Reputation System module for SCIBASE issue #15. It focuses on abuse-resistant reputation operations: review-quality scoring, rapid review burst detection, reciprocal endorsement rings, anonymous-review safety, transparent reputation adjustments, badge quarantine decisions, appeal packets, moderator queues, and public transparency reports.

## Scope

- Review quality scoring based on evidence anchors, detail, helpful votes, score balance, and flags.
- Review-rate anomaly detection for suspicious bursts of low-effort reviews.
- Low-quality review burst detection.
- Reciprocal endorsement ring detection.
- Anonymous and double-blind review safety checks.
- Reputation adjustment records with transparent bonuses, penalties, and reasons.
- Badge quarantine evaluation against guardrail thresholds.
- Appeal packet generation with relevant findings, moderator checklist, and recommended resolution.
- Moderator queue prioritization for high-severity findings, appeals, and badge freezes.
- Public transparency report for reviewed users, reviews, endorsements, findings, frozen badges, and open appeals.
- Local API endpoints and tests for reviewer validation.

No database, authentication provider, email service, or external moderation system is required. The module runs entirely from deterministic sample data and pure JavaScript helpers.

## Run Locally

```bash
npm run check
npm test
PORT=4366 npm start
```

Smoke endpoints:

```bash
curl -fsS http://localhost:4366/api/health
curl -fsS http://localhost:4366/api/abuse-report
curl -fsS http://localhost:4366/api/adjustments
curl -fsS http://localhost:4366/api/badges
curl -fsS 'http://localhost:4366/api/appeal?id=appeal-001'
curl -fsS http://localhost:4366/api/moderator-queue
curl -fsS http://localhost:4366/api/transparency
```

## Demo Flow

1. Open `/api/abuse-report` to see rapid review bursts, low-quality review clusters, endorsement rings, and anonymous-review safety findings.
2. Open `/api/adjustments` to inspect transparent reputation bonuses and penalties.
3. Open `/api/badges` to see which badges are frozen pending review.
4. Open `/api/appeal?id=appeal-001` to inspect the appeal packet and moderator checklist.
5. Open `/api/moderator-queue` to see high-priority abuse and appeal work.
6. Open `/api/transparency` to review the public guardrail report.

See `docs/requirement-map.md` for issue requirement coverage.
