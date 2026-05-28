# Credit Ledger Reputation Auditor

This prototype audits the contributor-credit and reputation-score surface of the Community & User Reputation System.

It checks synthetic researcher profiles for:

- invalid CRediT taxonomy roles
- duplicate credit events
- late backfilled credits
- disputed credits included in reputation totals
- missing contributor attestations
- reputation component mismatches against a transparent formula
- badge eligibility drift
- low-quality peer reviews that still received reputation
- credit events missing project timeline or citation links

## Run

```sh
node community-user-reputation-system/credit-ledger-reputation-auditor/test.js
node community-user-reputation-system/credit-ledger-reputation-auditor/demo.js
node community-user-reputation-system/credit-ledger-reputation-auditor/make-demo-video.js
```

All fixtures are synthetic. The module performs no account, private profile, credential, institutional reporting, tax, or external API access.
