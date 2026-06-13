# Peer Review Evidence Recertification Guard

Project: project-alpha-replication
Generated: 2026-05-28T06:00:00Z

## Summary

- Total reviews evaluated: 5
- Stale reviews requiring recertification: 3
- Stale inline comments requiring anchor review: 1
- Frozen reputation delta: 41
- Recommended action: block-reputation-update
- Timeline audit digest: sha256:1b0987a020a04c8f099d4b2b06835c92e4a97862b9de96d13834e3ca4e62107f

## Stale Review Evidence

- review-dataset-methods: artifact-digest-changed, artifact-updated-after-review
- review-missing-public-reviewer: reviewer-identity-missing
- review-blind-data: artifact-digest-changed, artifact-updated-after-review

## Recertification Tasks

- recertify-review-dataset-methods (peer-review, high): confirm-review-still-applies-to-current-artifact
- recertify-review-missing-public-reviewer (peer-review, normal): confirm-review-still-applies-to-current-artifact
- recertify-review-blind-data (peer-review, normal): confirm-review-still-applies-to-current-artifact
- recertify-comment-code-line-41 (inline-comment, normal): confirm-comment-anchor-still-matches-current-artifact

## Sparse Snapshot Guard

Sparse project payloads that omit review, comment, or artifact collections still produce deterministic audit packets instead of runtime failures. The empty evidence fixture recommends allow-reputation-update and emits 0 timeline events.

## Invalid Reputation Delta Packet

Malformed review reputation deltas require recertification before profile credit is applied. The invalid-delta fixture recommends block-reputation-update, emits 1 stale review, and normalizes the frozen reputation delta to 0.

## Malformed Evidence Entry Packet

Malformed review and inline-comment entries inside otherwise valid evidence arrays are converted into recertification holds instead of crashing or being silently ignored. The malformed-entry fixture recommends block-reputation-update, emits 1 stale review and 1 stale inline comment, and creates 2 recertification tasks.

## Malformed Evidence Collection Packet

Malformed non-array review and inline-comment collections are converted into recertification holds instead of being treated like omitted evidence. The malformed-collection fixture recommends block-reputation-update, emits 1 stale review and 1 stale inline comment, and creates 2 recertification tasks.

## Backdated Recertification Packet

Recertification timestamps that predate the original review submission are blocked as impossible audit chronology. The backdated-recertification fixture recommends block-reputation-update, emits 1 stale review, and records recertification-before-submission before profile credit is applied.

## Malformed Project Packet

Malformed top-level recertification packets are converted into reviewer-visible recertification holds instead of crashing before timeline evidence is generated. The malformed-project fixture recommends block-reputation-update, emits 1 stale review hold, and records malformed-project-evidence for unidentified-project.

## Invalid Project Timestamp Packet

Project snapshot timestamps must be valid before reputation updates can be applied. The invalid-project-timestamp fixture recommends block-reputation-update, emits 1 project evidence hold, creates 1 recertification task, and records null generatedAt in the audit timeline packet.

## Privacy Notes

Double-blind reviewer identifiers are replaced with reviewer-safe anonymous labels in tasks and timeline events. The audit packet uses synthetic data only and does not contain private profile emails, live profile IDs, credentials, or external API output.
