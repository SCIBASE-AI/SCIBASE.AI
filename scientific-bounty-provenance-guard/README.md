# Scientific Bounty System and Provenance Guard

This package provides a self-contained, dependency-free implementation of the
Scientific Bounty System requested in issue #18. It combines a lifecycle engine,
a browser demo, and a provenance guard so reviewers can exercise the path from a
funded challenge through a private submission and settled milestone award.

## Issue #18 Coverage

- challenge posting validates scientific context, deliverables, weighted rubrics,
  ordered phases, prize and payout schedules, public/private access,
  prequalification, NDA, participation mode, and five R&D templates;
- private team workspaces enforce access and preserve versioned submission and
  audit records, including anonymous display names and artifact manifests;
- independent review combines checklists, rubric scoring, feedback, and
  provenance decisions before an award can be planned;
- escrow-backed milestone, final, and honorable-mention awards route funds to
  individuals, teams, or institutions without overspending a schedule entry;
- default, sponsored, and open IP policies preserve the solver's ownership or
  transfer state at the payment seam specified by the challenge.

The system produces deterministic payment plans and records external payment
references; it does not hold keys or transmit funds. The provenance guard
validates artifact declarations, detects exact and near-duplicate submissions,
and produces reproducible release, revise, or hold reviewer packets.

## Usage

```bash
npm test
npm run demo
npm start
```

## Lifecycle Model

`ScientificBountySystem` is the module interface. Callers post a validated and
escrow-backed challenge, open an eligible solver workspace, submit a phase
package, record an independent review, plan one scheduled award, and settle it
with a real payment reference. Every transition fails closed and appends an
audit event. `demo/index.html` exercises that complete interface in a browser.

## Decision Model

- `release`: submission has complete provenance and no duplicate signal.
- `revise`: submission can proceed after missing hash/license/repro notes are fixed.
- `hold`: duplicate hashes or near-duplicate scientific rationale require review
  before payout, IP transfer, or sponsor acceptance.

## Files

- `src/system.js`: end-to-end challenge, workspace, submission, review, escrow,
  payout-routing, IP-state, privacy, and audit implementation.
- `src/index.js`: provenance and duplicate-submission guard plus package exports.
- `test/system.test.js`: lifecycle invariants and end-to-end settlement tests.
- `test/provenanceGuard.test.js`: deterministic provenance test suite.
- `demo/index.html` and `demo/app.js`: interactive lifecycle demo.
- `scripts/serve.js`: dependency-free local demo server.
- `scripts/demo.js`: reviewer-report generator.
- `examples/submissions.json`: sample provenance packet.
- `artifacts/reviewer-report.md`: reviewer-facing provenance report.
- `artifacts/lifecycle.png`, `artifacts/lifecycle.webm`,
  `artifacts/summary.svg`, `artifacts/summary.png`, and `artifacts/demo.mp4`:
  claim evidence artifacts.
