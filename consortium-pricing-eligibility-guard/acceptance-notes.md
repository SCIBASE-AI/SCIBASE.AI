# Acceptance Notes

## Scope

This PR adds a focused consortium pricing eligibility guard for the Revenue Infrastructure bounty. It is intentionally narrower than a full billing system and avoids duplicating the existing revenue dispute, SLA credit, FX settlement, plan migration, forecast, royalty, invoice acceptance, and contract allocation slices.

## Reviewer Flow

1. Run the test script.
2. Run the demo script.
3. Inspect `demo-output/audit-packets.json` for held invoice reasons, reviewer tasks, net amounts, and digests.
4. Inspect `demo-output/demo.svg` or the included demo video for a quick visual summary.

## Expected Decisions

- `INV-2026-0501` is held because the membership expired, the consortium discount exceeds the member cap, discount stacking is too high, and evidence is missing.
- `INV-2026-0502` is approved because the member is active, the discount is within cap, and evidence is present.
- `INV-2026-0503` is held because stacking exceeds the policy limit and renewal notice evidence is missing.
- `INV-2026-0504` is approved for a valid Pacific Open Data Consortium member.

## Validation Commands

```powershell
node consortium-pricing-eligibility-guard/test.js
node consortium-pricing-eligibility-guard/demo.js
node --check consortium-pricing-eligibility-guard/index.js
node --check consortium-pricing-eligibility-guard/test.js
node --check consortium-pricing-eligibility-guard/demo.js
node --check consortium-pricing-eligibility-guard/sample-data.js
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height -of default=noprint_wrappers=1 consortium-pricing-eligibility-guard/demo-output/demo.mp4
git diff --check
```
