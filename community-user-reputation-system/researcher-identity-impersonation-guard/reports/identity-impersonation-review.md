# Researcher Identity Impersonation Review

Profile: Elena Voss (elena-v0ss-lab)
Decision: hold-profile-trust
Risk score: 100
Held events: 3
Audit digest: 38379a53025543a7

## Findings
- [medium] External identifier verification is stale: ORCID:SYNTH-ORCID-ELENA-0001 was last verified 501 days before review.
  Action: Refresh the ORCID, institutional, or external-profile verification before publishing profile trust signals.
- [blocker] Identifier is already bound to another profile: ORCID:SYNTH-ORCID-ELENA-0001 is already claimed by researcher-elena-voss.
  Action: Block trust updates and open an identity-resolution case before endorsements or badges are applied.
- [high] External identifier is not verified: INSTITUTIONAL_EMAIL:evoss@northstar-labs.example is marked pending for profile profile-provisional-884.
  Action: Hold reputation-bearing actions until the identifier is verified through an approved channel.
- [high] Institutional affiliation does not match verified email domain: Elena Voss claims Northstar Institute, but email domain northstar-labs.example is outside northstar.edu, research.northstar.edu.
  Action: Require fresh affiliation proof or show the affiliation as unverified before profile exports or reputation changes.
- [medium] Affiliation verification is stale: Affiliation was last verified 493 days before review.
  Action: Refresh affiliation evidence before using the institution in leaderboards or citation pages.
- [high] Profile uses a reserved or high-trust researcher display name: Elena Voss matches a reserved researcher name without an approval record.
  Action: Hold public trust badges and route the profile through manual identity review.
- [high] Profile handle is visually close to a trusted researcher profile: elena-v0ss-lab is distance 1 from trusted handle elena-voss-lab.
  Action: Hold endorsements and require reviewer confirmation that the profile is not impersonating the trusted account.
- [medium] Display name is ambiguous with an existing researcher profile: Elena Voss has 98% similarity with researcher-elena-voss.
  Action: Render an ambiguity warning and require stronger verified identifiers before reputation deltas are shown.
- [medium] Profile identity fields changed shortly before a reputation-bearing event: handle changed from ev-lab-provisional to elena-v0ss-lab 4 days before review.
  Action: Freeze the affected reputation event until the changed identity field is acknowledged in the audit trail.
- [medium] Profile identity fields changed shortly before a reputation-bearing event: displayName changed from E. Voss Research to Elena Voss 3 days before review.
  Action: Freeze the affected reputation event until the changed identity field is acknowledged in the audit trail.
- [blocker] Trust event would reveal an anonymous or double-blind reviewer identity: review-credit-19 links profile identity into a double-blind review context.
  Action: Block the public profile update and issue an anonymous-review-safe receipt instead.
- [medium] External profile evidence is weak: GitHub confidence is 0.52 with proof profile-url-only.
  Action: Show the external profile as unverified and exclude it from reputation calculations.

## Safety
- Synthetic profile packets only; no credentials, private profiles, live ORCID, institutional directory, or external identity-provider calls.
