# Requirements Map

Issue #16 asks for an AI-Powered Research Assistant Suite with auto peer review, reproducibility checking, and research-gap support. This slice adds a safety gate that makes those assistant outputs trustworthy before they are shown to researchers or reviewers.

## Auto Peer Review Reports

- Scans manuscript and supplement content for hostile instructions such as ignoring prior rules, revealing hidden prompts, coercing reviewer outcomes, or exfiltrating secrets.
- Checks assistant-generated review findings for declared evidence anchors.
- Blocks accept/reject recommendations that conflict with unresolved evidence blockers.
- Emits reviewer-ready Markdown and JSON packets.

## Reproducibility Checker

- Indexes manuscript claims, artifacts, and citation corpus entries as reproducibility/evidence sources.
- Computes support scores for review findings against artifact and claim text.
- Flags missing evidence anchors and unknown citation ids before the assistant packet is released.

## Research Gap Finder

- Keeps unsupported or prompt-injected findings out of downstream opportunity feeds.
- Preserves safe, evidence-linked findings for follow-up research-gap ranking.
- Provides action items to replace hallucinated anchors with verified manuscript, artifact, or citation ids.

## Operational Expectations

- Dependency-free Node implementation.
- Synthetic data only.
- Deterministic tests and demo output.
- JSON, Markdown, SVG, and MP4 artifacts for review.
