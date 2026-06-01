# Compute Meter Replay Guard

This module adds a deterministic guard for AI compute revenue metering before
usage events are converted into invoice lines.

It is scoped to synthetic billing telemetry only. It does not connect to Stripe,
PayPal, bank accounts, wallets, customer systems, cloud meters, or private
research data.

## Why This Belongs In Revenue Infrastructure

Usage-based AI billing depends on reliable metering. A replay job, duplicate
event, missing idempotency key, stale correction, or unauthorized negative
adjustment can overbill customers, underbill usage, or create finance disputes.
This guard reviews a batch of synthetic meter events and decides whether the
invoice run can proceed, needs repricing, or must be held.

## Checks

- Missing idempotency keys before billing.
- Duplicate idempotency keys inside the replay window.
- Reused invoice-line IDs across separate usage events.
- Source sequence gaps that may indicate lost meter events.
- Corrections older than the allowed correction window.
- Negative adjustments without an authorized finance or meter role.
- Plan and entitlement mismatches between event metadata and account state.
- Event timestamp ordering problems.

## Usage

```bash
node compute-meter-replay-guard/src/compute-meter-replay-guard.mjs \
  compute-meter-replay-guard/fixtures/compute-meter-events.json \
  --format markdown
```

JSON output:

```bash
node compute-meter-replay-guard/src/compute-meter-replay-guard.mjs \
  compute-meter-replay-guard/fixtures/compute-meter-events.json \
  --format json
```

## Validation

```bash
node compute-meter-replay-guard/test/run-tests.mjs
```

Expected result:

```text
compute meter replay guard tests passed
```

## Demo Artifacts

- `demo/sample-report.md`
- `demo/sample-report.json`
- `demo/decision-flow.svg`
- `demo/decision-flow.png`
- `demo/compute-meter-replay-demo.mp4`

## Scope Boundaries

This assistant intentionally avoids:

- live payment processors, banks, wallets, cards, or invoices;
- real customer data;
- external APIs or cloud billing systems;
- tax, accounting, legal, or financial advice;
- replacing human finance approval.

It is a pre-invoice control that highlights billing evidence gaps and replay
risks for review.
