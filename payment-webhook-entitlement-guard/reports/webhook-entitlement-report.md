# Payment Webhook Entitlement Guard Report

Account scope: lab-account-north-42
Status: hold_entitlement_activation
Generated: 2026-05-21T09:20:00.000Z

## Summary

- Orders checked: 2
- Events checked: 4
- Existing grants checked: 1
- Blockers: 11
- Warnings: 0
- Activation candidates: 3
- Reversals: 1

## Recommendation

Hold activation, reconcile webhooks, and do not grant paid features or AI compute credits.

## Blockers

- evt-paid-100: duplicate_webhook_event_id - Duplicate webhook event IDs must not grant paid entitlements twice.
- evt-paid-100: out_of_order_webhook_lifecycle - Paid webhook arrived before required lifecycle events.
- evt-paid-100: double_credit_entitlement_grant - Order already has an entitlement grant or paid event.
- evt-paid-100: duplicate_webhook_event_id - Duplicate webhook event IDs must not grant paid entitlements twice.
- evt-paid-100: out_of_order_webhook_lifecycle - Paid webhook arrived before required lifecycle events.
- evt-paid-100: double_credit_entitlement_grant - Order already has an entitlement grant or paid event.
- evt-paid-200: amount_or_currency_mismatch - Paid webhook amount/currency does not match the order.
- evt-paid-200: out_of_order_webhook_lifecycle - Paid webhook arrived before required lifecycle events.
- evt-refund-200: invalid_webhook_signature - Webhook signature failed verification.
- evt-refund-200: stale_webhook_signature - Webhook signature is outside the accepted replay window.
- evt-refund-200: payment_reversal_requires_entitlement_hold - Refund, dispute, or reversal event requires entitlement hold/reconciliation.

## Activation Plan

- order order-ai-topup-100: event evt-paid-100, account lab-account-north-42
- order order-ai-topup-100: event evt-paid-100, account lab-account-north-42
- order order-institution-200: event evt-paid-200, account university-enterprise-7
