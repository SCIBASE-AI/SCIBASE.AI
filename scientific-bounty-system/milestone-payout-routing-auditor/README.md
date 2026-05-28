# Milestone Payout Routing Auditor

This prototype covers the arbitration and reward-distribution portion of the Scientific Bounty System. It validates whether a challenge can safely route milestone and final-award payments before sponsor acceptance.

The auditor checks synthetic challenge records for:

- escrow coverage against prize and reserve requirements
- milestone payout totals and acceptance criteria
- solver team split totals
- payee payout readiness and institution tax metadata
- IP transfer timing relative to payment release
- honorable mention reserves
- arbitration reviewer coverage
- NDA template readiness for private challenges

## Run

```sh
node scientific-bounty-system/milestone-payout-routing-auditor/test.js
node scientific-bounty-system/milestone-payout-routing-auditor/demo.js
node scientific-bounty-system/milestone-payout-routing-auditor/make-demo-video.js
```

All fixtures are synthetic. The auditor performs no credential, private payment, KYC, tax-form, bank-account, or external API access.
