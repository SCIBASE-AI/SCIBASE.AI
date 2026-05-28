# Billing Readiness Guard

Account: Nova Omics Lab (lab-nova-omics)
Decision: block-payment-provider-handoff
Total: $1704.10 USD
Risk score: 100
Invoice digest: 3f2b8b021ae67a7c

## Invoice Lines
- subscription:lab:monthly: 1 x $249.00 = $249.00
- subscription:extra-seats: 8 x $12.00 = $96.00
- usage:ai-tokens: 1600 x $0.04 = $64.00
- usage:compute-hours: 80 x $2.40 = $192.00
- usage:storage-gb: 350 x $0.12 = $42.00
- usage:api-calls: 15 x $0.03 = $0.45
- licensing:analytics-access: 1 x $750.00 = $750.00
- licensing:api-package: 1 x $500.00 = $500.00
- discount:OPEN-SCIENCE-PILOT: 1 x $-189.35 = $-189.35

## Findings
- [blocker] No collectable payment path is configured: lab-nova-omics has no payment provider customer and no invoice email.
  Action: Collect a Stripe customer, verified payment method, or institutional invoice contact before handoff.
- [high] Billing tax profile is incomplete: lab-nova-omics country=US taxId=missing.
  Action: Hold the invoice until country and tax ID requirements are complete.
- [blocker] Invoice total exceeds the approved budget cap: $1704.10 exceeds approved cap $450.00.
  Action: Require budget owner approval or reduce billable usage before collection.
- [medium] Usage spike should be reviewed before invoicing: aiTokens rose from 800000 to 3600000.
  Action: Review audit logs or usage annotations before sending the invoice.
- [medium] Usage spike should be reviewed before invoicing: computeHours rose from 18 to 120.
  Action: Review audit logs or usage annotations before sending the invoice.
- [medium] Usage spike should be reviewed before invoicing: apiCalls rose from 4000 to 25000.
  Action: Review audit logs or usage annotations before sending the invoice.
- [high] Compute overage lacks reviewer attestation: lab-nova-omics used 120 compute hours against 40 included.
  Action: Ask the project owner to attest that the compute jobs were authorized.
- [blocker] Licensing export is not aggregate-anonymized: lab-nova-omics requested project-level export mode.
  Action: Allow only aggregate-anonymized metadata exports for licensing revenue.
- [blocker] Private research content cannot be included in licensing exports: lab-nova-omics licensing packet includes private content.
  Action: Remove private project content and regenerate the export manifest before billing.
- [high] Data licensing requires a data-processing agreement: lab-nova-omics has analytics licensing enabled without a DPA reference.
  Action: Collect the institutional DPA before allowing analytics licensing billing.

## Safety
- Synthetic billing packet only; no Stripe, PayPal, bank, customer, tax, contract, private content, or external API calls.
