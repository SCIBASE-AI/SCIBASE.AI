# Implementation Plan (Issue #15)

## Phase 1

- Apply SQL schema and seed action type weights.
- Add reputation event write path with idempotency enforcement.
- Add snapshot recompute function and deterministic badge tier mapping.

## Phase 2

- Add moderation endpoints and appeal workflow.
- Add admin list pages for trust-state and flagged users.
- Add audit export endpoint for compliance workflows.

## Phase 3

- Add scoring explainability UI (top positive/negative contributors).
- Add anti-gaming heuristics (rate limits, burst penalties, linked-account checks).
- Add tuning panel for action weights (admin-only with versioned changes).

## Success Criteria

- Every score change is traceable to immutable event rows.
- Moderation actions are explainable and appealable.
- Score and tier recomputation is reproducible from event history.
