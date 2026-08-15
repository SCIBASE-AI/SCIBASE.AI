# Bounty AI Assistance Disclosure Review

Generated: 2026-08-15T20:59:43.334Z

## Decision Counts

- RELEASE: 1
- REVIEW: 1
- HOLD: 2

## Packet Reviews

### Transparent AI-assisted climate forecast submission
Challenge: Regional climate forecasting bounty
Decision: RELEASE
Confidence: 0.96
AI used: true
Generated components: 1
Reviewer note: Regional climate forecasting bounty: AI-assistance disclosure, provenance, human review, and reproducibility evidence are scoring-ready.

### AI-assisted materials model with incomplete provenance
Challenge: Materials discovery bounty
Decision: REVIEW
Confidence: 0.7
AI used: true
Generated components: 1
Reviewer note: Materials discovery bounty: REVIEW before scoring because an ai-generated component lacks human review attestation.
- MAJOR GENERATED_COMPONENT_NOT_HUMAN_REVIEWED: An AI-generated component lacks human review attestation.
  Remediation: Add human review evidence before the component can be scored or released to a sponsor.
- MINOR GENERATED_COMPONENT_MISSING_PROVENANCE_HASH: An AI-generated component does not include a provenance or artifact hash.
  Remediation: Add a stable artifact hash, prompt digest, or build provenance digest.

### Undisclosed AI-generated solver report
Challenge: Single-cell biomarker bounty
Decision: HOLD
Confidence: 0.1
AI used: true
Generated components: 1
Reviewer note: Single-cell biomarker bounty: HOLD before scoring because the submission used ai assistance without the disclosure required by the challenge policy.
- CRITICAL AI_ASSISTANCE_UNDISCLOSED: The submission used AI assistance without the disclosure required by the challenge policy.
  Remediation: Require an explicit AI-use disclosure before scoring, award release, or sponsor handoff.
- MAJOR MISSING_HUMAN_REVIEW_ATTESTATION: AI-assisted work lacks a completed human review attestation.
  Remediation: Add named reviewer, review date, reviewed components, and residual-risk notes.
- MAJOR AI_ASSISTED_WORK_NOT_REPRODUCIBLE: The submission lacks reproducibility commands or environment notes for AI-assisted deliverables.
  Remediation: Add commands, environment, seeds, and artifact hashes sufficient for sponsor-side reproduction.
- MAJOR UNAPPROVED_AI_TOOL_USED: The submission used an AI/tooling system that is not listed in the challenge-approved tool policy.
  Remediation: Add sponsor approval evidence for the tool or rerun the affected work with an approved toolchain.
- MAJOR AI_TOOL_NOT_LISTED_IN_DISCLOSURE: An apparent AI tool is present in provenance records but not listed as disclosed.
  Remediation: Update the solver disclosure packet so reviewers can see which AI tools touched the deliverable.
- MAJOR GENERATED_COMPONENT_NOT_DISCLOSED: An AI-generated component is not clearly disclosed in the submission packet.
  Remediation: Mark the generated component and explain how it was produced and reviewed.
- MAJOR GENERATED_COMPONENT_NOT_HUMAN_REVIEWED: An AI-generated component lacks human review attestation.
  Remediation: Add human review evidence before the component can be scored or released to a sponsor.
- MINOR GENERATED_COMPONENT_MISSING_PROVENANCE_HASH: An AI-generated component does not include a provenance or artifact hash.
  Remediation: Add a stable artifact hash, prompt digest, or build provenance digest.

### Private sponsor data sent through AI workflow
Challenge: Protein design bounty
Decision: HOLD
Confidence: 0.1
AI used: true
Generated components: 1
Reviewer note: Protein design bounty: HOLD before scoring because ai assistance appears to have used data classes prohibited by the challenge policy.
- CRITICAL PROHIBITED_DATA_SENT_TO_AI: AI assistance appears to have used data classes prohibited by the challenge policy.
  Remediation: Hold the packet, notify the sponsor, and require a clean-room rerun or documented exception.
- CRITICAL PRIVATE_DATA_IN_AI_WORKFLOW: The AI workflow or final packet includes private or sponsor-restricted data.
  Remediation: Remove private data, regenerate affected artifacts, and provide reviewer-safe provenance evidence.
- CRITICAL PROMPT_OR_SECRET_LEAKAGE: The packet appears to expose prompts, secrets, bearer tokens, or private workflow instructions.
  Remediation: Redact the packet, rotate any exposed credentials if real, and resubmit reviewer-safe evidence only.
- MAJOR GENERATED_COMPONENT_LICENSE_MISMATCH: A generated component uses a license outside the challenge submission policy.
  Remediation: Relicense, remove, or obtain sponsor approval before scoring the submission.

