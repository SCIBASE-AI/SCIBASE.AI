# Trial Promotion Abuse Guard

Digest: `10e4c417b4549c81935ca8a9687f675c88c7d0672e5a65bb87e151835bc15122`

## Summary

- Events reviewed: 7
- Approved: 2
- Held: 4
- Rejected: 1
- Discount leakage prevented: $1310.00

## Decisions

| Event | Account | Status | Reason codes |
| --- | --- | --- | --- |
| evt-alpha-trial | Alpha Neuro Lab | approved | none |
| evt-alpha-shadow-trial | Alpha Neuro Lab Sandbox | hold | domain_trial_reuse, payment_trial_reuse |
| evt-temp-trial | Temporary Trial Workspace | rejected | disposable_domain |
| evt-alpha-stack | Alpha Neuro Lab Sandbox | hold | coupon_stack_exceeds_policy, requires_paid_plan, discount_cap_exceeded |
| evt-consortium-expired | Northern Consortium Pilot | hold | consortium_roster_not_active, discount_cap_exceeded |
| evt-convert-missing-payment | Vector Bio Trial | hold | payment_not_verified, conversion_payment_missing |
| evt-clean-lab-discount | Harbor Methods Lab | approved | none |

## Finance Action
Hold rejected or held trials/promotions before invoice release, route consortium exceptions to finance review, and only let approved discount cents reach revenue reporting.
