# Institutional Invoice Delivery Assurance Summary

- Total invoices: 5
- Release to AR: 1
- Retry delivery: 1
- Hold for finance: 3
- Accepted routes: 5
- Required actions: 10

| Invoice | Decision | AR status | Findings | Actions |
| --- | --- | --- | --- | --- |
| INV-DELIV-001 | release_to_ar | start_ar_aging | none | release-invoice-to-ar-aging |
| INV-BOUNCE-002 | hold_for_finance | do_not_age_or_dun | STALE_AP_CONTACT, HARD_DELIVERY_BOUNCE, NO_ACCEPTED_DELIVERY_ROUTE | pause-ar-aging-and-dunning, refresh-ap-route-and-redeliver, reverify-ap-contact |
| INV-PORTAL-003 | retry_delivery | pause_ar_aging_until_delivery_evidence | DELIVERY_RETRY_PENDING, MISSING_PORTAL_RECEIPT | pause-ar-aging-and-dunning, upload-to-customer-portal |
| INV-PO-004 | hold_for_finance | do_not_age_or_dun | MISSING_PO_ATTACHMENT | pause-ar-aging-and-dunning, attach-po-evidence-before-redelivery |
| INV-HASH-005 | hold_for_finance | do_not_age_or_dun | DELIVERED_PDF_HASH_MISMATCH, MISSING_FINANCE_OWNER | pause-ar-aging-and-dunning, regenerate-and-redeliver-approved-pdf |
