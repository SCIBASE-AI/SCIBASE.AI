# Acceptance Notes

## Local Validation

Run from `structured-abstract-consistency-assistant/`:

```powershell
npm test
npm run demo
npm run video
npm run check
```

Expected evidence:

- `reports/blocked-packet.json` holds AI peer-review release when abstract claims conflict with methods and results.
- Same-code findings are preserved when methods and results disagree on different evidence targets.
- Missing source methods/results evidence packets hold release instead of treating a complete abstract as verified.
- Source methods/results evidence marked retracted, withdrawn, superseded, stale, expression-of-concern, or unsafe holds release until unsafe evidence is replaced.
- Missing source methods/results primary-endpoint evidence holds release instead of letting generic primary-endpoint wording become reviewer-facing evidence.
- Source methods/results primary-endpoint disagreements hold release instead of letting the abstract follow only one source evidence packet.
- Malformed top-level manuscript packets hold release with stable `unknown-manuscript` evidence instead of crashing before AI peer-review gating.
- Invalid, missing, or calendar-impossible `assessedAt` timestamps hold release instead of allowing reviewer packets with unauditable structured-abstract timing evidence.
- Negated methods design statements such as "not a retrospective cohort" are blocked instead of satisfying the expected design by substring.
- Negated primary endpoint statements such as "not comment triage time" are blocked instead of satisfying the expected endpoint by substring.
- Comma-formatted manuscript counts such as `1,200` are accepted as matching numeric sample-size evidence.
- Percentages such as `96%` are rejected as sample-size evidence unless the actual manuscript/participant count is also stated.
- Decimal values such as `0.96` are rejected as sample-size evidence unless the actual manuscript/participant count is also stated.
- Duration or effect measurements such as `96 hours` or `96 minutes` are rejected as sample-size evidence unless the actual manuscript/participant count is also stated.
- Abbreviated scientific/time units such as `96 h`, `96 mg`, or `96 mmHg` are rejected as sample-size evidence unless the actual manuscript/participant count is also stated.
- Hyphenated measurements such as `96-hour` or `96-point` are rejected as sample-size evidence unless the actual manuscript/participant count is also stated.
- Ordinal measurements such as `96th percentile` are rejected as sample-size evidence unless the actual manuscript/participant count is also stated.
- Result-direction checks block abstracts that describe worse or harmful results as improvements.
- Result-direction checks also block abstracts that describe improved results as worse, harmful, or no-effect.
- Result-section certainty overclaims such as statistically significant or clinically meaningful are blocked when evidence is exploratory or confidence intervals cross null.
- Mixed result-section certainty phrasing such as not statistically significant but clinically meaningful is blocked instead of being cleared by the negated significant phrase.
- Conclusion-section certainty overclaims such as statistically significant or clinically meaningful are blocked when evidence is exploratory or confidence intervals cross null.
- Weak conclusion hedges such as "may" alone do not satisfy limitation-language requirements for exploratory or null-crossing evidence.
- Conclusion-direction checks block reviewer-facing conclusion benefit claims when the result packet records no effect, worse outcomes, or harm.
- Conclusion-direction checks block safety-benefit claims such as safe or well tolerated when adverse-outcome evidence worsens.
- Conclusion-direction checks block negated safety-concern claims such as no safety concerns when adverse-outcome evidence worsens.
- Negated benefit wording such as did not improve is treated as no-effect/worse language instead of a positive improvement claim.
- Conclusion-direction checks also block reviewer-facing conclusion worse/no-effect claims when the result packet records improvement.
- Benefit-language checks include lower/shorter/faster outcome wording, not only "improved" phrasing.
- Accurate adverse-outcome wording such as increased adverse events is not mistaken for a benefit claim when the result packet also records a worse direction.
- `reports/revision-packet.json` stages an incomplete but otherwise evidence-aligned abstract for author revision.
- `reports/negated-design-packet.json` holds an abstract that mentions the expected methods design only to deny it.
- `reports/negated-primary-endpoint-packet.json` holds an abstract that mentions the expected primary endpoint only to deny it.
- `reports/missing-source-evidence-packet.json` holds an otherwise polished abstract until source methods/results evidence is attached.
- `reports/missing-results-endpoint-packet.json` holds an otherwise complete abstract until source results evidence names the primary endpoint.
- `reports/missing-methods-endpoint-packet.json` holds an otherwise complete abstract until source methods evidence names the primary endpoint.
- `reports/source-endpoint-mismatch-packet.json` holds an otherwise complete abstract until methods/results source endpoint evidence is reconciled.
- `reports/malformed-manuscript-packet.json` holds malformed top-level manuscript input with repair and source-evidence remediation.
- `reports/invalid-assessed-at-packet.json` holds an otherwise complete abstract until assessment timestamp evidence is repaired.
- `reports/impossible-assessed-at-packet.json` holds an otherwise complete abstract when an ISO-looking assessment timestamp uses an impossible calendar date.
- `reports/result-certainty-packet.json` holds an abstract whose results overstate uncertain or null-crossing evidence.
- `reports/mixed-certainty-packet.json` holds an abstract whose results mix negated statistical significance with an asserted clinical-meaningfulness overclaim.
- `reports/conclusion-certainty-packet.json` holds an abstract whose conclusion overstates uncertain or null-crossing evidence.
- `reports/weak-limitation-packet.json` holds an abstract whose conclusion only weakly hedges uncertain evidence.
- `reports/percentage-sample-size-packet.json` holds an abstract that uses percentage wording where required sample-size counts should appear.
- `reports/decimal-sample-size-packet.json` holds an abstract that uses decimal effect-size wording where required sample-size counts should appear.
- `reports/duration-sample-size-packet.json` holds an abstract that uses duration/effect-measure wording where required sample-size counts should appear.
- `reports/abbreviated-unit-sample-size-packet.json` holds an abstract that uses abbreviated measurement wording where required sample-size counts should appear.
- `reports/hyphenated-measurement-sample-size-packet.json` holds an abstract that uses hyphenated measurement wording where required sample-size counts should appear.
- `reports/ordinal-sample-size-packet.json` holds an abstract that uses ordinal measurement wording where required sample-size counts should appear.
- `reports/clean-packet.json` releases a consistent structured abstract with monitoring.
- `reports/abstract-consistency-report.md` summarizes lanes and finding codes.
- `reports/summary.svg` provides a visual review packet.
- `reports/demo.mp4` is a short H.264 walkthrough generated from synthetic frames.

## Safety Boundaries

All records are synthetic. The module does not call external models, citation APIs, manuscript stores, credential systems, payment systems, or private research databases.
