# Cover Letter Export Guard Report

- Packet: submission-blocked-cover-letter
- Manuscript: Model-assisted detection of assay drift in synthetic submissions
- Decision: HOLD
- Audit digest: fa958c5cf99c0caa

## Findings

- HIGH STALE_COVER_LETTER_HASH: Cover letter references ms-v10-21bd, but final manuscript is ms-v11-aa30.
  Remediation: Regenerate the cover-letter packet from the final manuscript version.
- HIGH MISSING_CORRESPONDING_AUTHOR_APPROVAL: Corresponding author approval is missing or tied to an older manuscript hash.
  Remediation: Collect a fresh corresponding-author approval after the final edit.
- MEDIUM COAUTHOR_APPROVAL_DRIFT: Missing fresh cover-letter approval from author-2, author-3.
  Remediation: Route the final cover-letter packet to every coauthor who is listed on the manuscript.
- MEDIUM CLAIM_MISMATCH_NOVELTY: Cover-letter novelty statement diverges from the manuscript claim.
  Remediation: Align cover-letter statements with the final manuscript disclosure text before export.
- HIGH CLAIM_MISMATCH_ETHICS: Cover-letter ethics statement diverges from the manuscript claim.
  Remediation: Align cover-letter statements with the final manuscript disclosure text before export.
- MEDIUM CLAIM_MISMATCH_DATAAVAILABILITY: Cover-letter dataAvailability statement diverges from the manuscript claim.
  Remediation: Align cover-letter statements with the final manuscript disclosure text before export.
- HIGH CLAIM_MISMATCH_CONFLICTS: Cover-letter conflicts statement diverges from the manuscript claim.
  Remediation: Align cover-letter statements with the final manuscript disclosure text before export.
- HIGH PRIVATE_COMMENT_LEAK: Cover-letter export includes private reviewer or collaborator notes.
  Remediation: Redact private comments and rebuild the editor-facing correspondence packet.
