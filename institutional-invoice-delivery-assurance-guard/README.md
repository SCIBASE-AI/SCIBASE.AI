# Institutional Invoice Delivery Assurance Guard

This module adds a dependency-free guard for institutional invoice delivery
evidence in the Revenue Infrastructure flow. It runs after an invoice is
generated and before AR aging, dunning, collections, or entitlement holds begin.

## Scope

The guard validates whether an invoice has truly reached the customer's
accounts-payable route:

- Billing email delivery, hard bounces, and retry windows.
- Customer portal upload receipts.
- Purchase-order attachment state for PO-required accounts.
- Invoice payload hash versus delivered PDF hash parity.
- Issue date and due date ordering.
- Fresh AP contact verification.
- Finance owner escalation for failed delivery packets.

This is separate from quote approval, billing receipt privacy, institutional
invoice collections, dunning entitlement holds, payment rail failover, revenue
recognition, and procurement controls.

## Run

```bash
python3 institutional-invoice-delivery-assurance-guard/invoice_delivery_assurance_guard.py \
  --sample \
  --json institutional-invoice-delivery-assurance-guard/demo/report.json \
  --markdown institutional-invoice-delivery-assurance-guard/demo/summary.md \
  --svg institutional-invoice-delivery-assurance-guard/demo/graph.svg
```

## Test

```bash
python3 -m unittest institutional-invoice-delivery-assurance-guard/test_invoice_delivery_assurance_guard.py
```
