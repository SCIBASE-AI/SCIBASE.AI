# Requirements Map

## Peer Reviews & Comments

- Structured peer-review evidence is tied to reviewed artifact digests.
- Missing, malformed, or backdated review submission and recertification timestamps require recertification before review credit is applied.
- Missing or malformed artifact change timestamps require review and inline-comment recertification before review credit or comment evidence is applied.
- Inline comments track artifact anchors and require recertification when anchors shift, artifact digests change, artifact timestamps postdate the comment, artifact timing evidence is missing or malformed, anchor metadata is missing, artifact anchor maps are missing, or comment timing evidence is missing or malformed.
- Stale review or inline-comment evidence blocks reputation updates until recertification is complete.
- Public, semi-private, and double-blind review modes are represented, with blind and fully anonymous labels normalized across hyphenated, underscored, and space-separated variants.
- Public and semi-private review credit requires a concrete reviewer identity before reputation deltas are applied.
- Malformed top-level recertification packets create blocked reviewer evidence for an unidentified project instead of crashing before timeline packets are generated.
- Missing or malformed project snapshot timestamps create project-evidence recertification tasks instead of releasing timeline packets with invalid generated-at evidence.
- Malformed review or inline-comment entries inside evidence arrays, and malformed non-array evidence collections, create recertification tasks instead of crashing evaluation or being silently ignored.
- Review history is emitted in a project timeline packet.
- Sparse project snapshots that omit review, comment, or artifact collections are evaluated as empty or missing evidence instead of runtime failures.

## Contributor Credits

- Review-derived reputation deltas are preserved as original deltas.
- Missing or malformed reputation-delta evidence blocks profile credit and is normalized out of frozen-delta summary math until recertified.
- Stale review evidence freezes effective deltas until recertification, and stale inline-comment evidence blocks reputation updates.
- Audit packets keep enough evidence for profile and citation-page credit decisions.

## Reputation Scoring

- Current reviews apply their transparent reputation delta.
- Stale reviews are blocked from leaderboards, badges, and score updates.
- Reviews with malformed reputation deltas are blocked from leaderboards, badges, and score updates until the delta is recertified.
- Reviews without non-blind reviewer identity are blocked from leaderboards, badges, and score updates until the identity is recertified.
- Recertification tasks explain which evidence must be refreshed.
- Project timestamp recertification blocks leaderboards, badges, and score updates until the audit snapshot time is repaired.
- Empty evidence snapshots produce an allow decision with zero frozen reputation delta and no synthetic tasks.

## Privacy And Trust

- Double-blind and fully anonymous reviewer IDs are replaced by anonymous labels even when incoming mode names use spaces or underscores, and labels that contain direct identifiers fall back to a generic anonymous reviewer.
- Synthetic data only; no private profile emails, credentials, or external API calls.
- The timeline audit digest is deterministic for reviewer verification.
