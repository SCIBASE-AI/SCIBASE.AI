# Community & User Reputation System (Issue #15)

This module adds a concrete foundation for community trust scoring, contribution
quality signals, and moderation-ready auditability.

## Deliverables in this PR

- Reputation data model (`reputation_schema.sql`)
- Public service API contract (`reputation_api_contract.json`)
- Implementation notes and rollout plan (`implementation_plan.md`)

## Scope

- Contributor profile scoring
- Event-sourced reputation ledger entries
- Weighted actions (publish/review/merge/report/help)
- Abuse/penalty controls
- Admin moderation and appeal lifecycle hooks
- Badge tier derivation

## Design principles

- Deterministic score derivation from immutable events
- Explainable score breakdown per user
- Audit-safe moderation actions (who/when/why)
- Backfill-friendly schema for historical imports
- Idempotent write patterns for async ingestion workers
