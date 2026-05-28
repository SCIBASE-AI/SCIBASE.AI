# Milestone Payout Routing Audit: Single-Cell Biomarker Discovery Prize

- Decision: hold-award-routing
- Risk score: 100
- Prize: $250,000.00
- Escrowed: $175,000.00
- Required escrow: $275,000.00
- Audit digest: 040ca7aa426f458a

## Findings

- [critical] ESCROW_UNDERFUNDED
  - Escrow $175,000.00 is below required $275,000.00.
  - Recommendation: Block launch until escrow equals the advertised prize and reserve.
- [high] MILESTONE_TOTAL_MISMATCH
  - Milestones total $280,000.00 but prize is $250,000.00.
  - Recommendation: Reconcile milestone payouts with the published prize schedule.
- [medium] MILESTONE_ACCEPTANCE_GAP
  - Milestone prototype is missing a due date.
  - Recommendation: Add objective acceptance criteria and due dates for every milestone.
- [medium] MILESTONE_ACCEPTANCE_GAP
  - Milestone final is missing acceptance criteria.
  - Recommendation: Add objective acceptance criteria and due dates for every milestone.
- [critical] SPLIT_TOTAL_INVALID
  - Team split totals 105% instead of 100%.
  - Recommendation: Require signed team allocation splits that total exactly 100%.
- [high] PAYEE_PAYOUT_NOT_READY
  - solver-bob is not ready for payout routing.
  - Recommendation: Collect payout readiness attestations before sponsor acceptance.
- [high] INSTITUTION_TAX_FORM_MISSING
  - university-lab is an institution without a tax form on file.
  - Recommendation: Collect institution tax and routing metadata before routing funds.
- [critical] PREPAYMENT_IP_TRANSFER
  - Challenge transfers solver IP before payment release.
  - Recommendation: Move IP transfer to a paid or escrow-released state.
- [medium] UNBUDGETED_HONORABLE_MENTION
  - Honorable mentions promise $20,000.00 without a reserve.
  - Recommendation: Reserve funds for honorable mentions or remove the promise.
- [medium] WEAK_ARBITRATION_PANEL
  - Contested awards have fewer than two independent reviewers.
  - Recommendation: Require at least two independent reviewers for contested awards.
- [high] NDA_TEMPLATE_MISSING
  - Private challenge requires NDA support but has no template attached.
  - Recommendation: Attach an NDA template before accepting private submissions.

## Release Checklist

- [!] Sponsor escrow covers prize, reserve, and promised mentions.
- [!] Milestone payout schedule reconciles to the published prize.
- [!] Solver team split agreement totals 100%.
- [!] All payees are payout-ready before sponsor acceptance.
- [!] IP transfer is gated on payment release.
