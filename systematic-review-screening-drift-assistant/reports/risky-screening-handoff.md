# Screening Assistant Handoff: prisma-living-review-cardiometabolic-ai

Decision: hold_systematic_review_assistant
Findings: 18
High or critical findings: 13
Audit digest: sha256:0c9ae18fee18fd54d887b93c23b161376559b3d740fe538f9902fe916ee704d4

## Required Actions
- set_ai_policy_to_assist_only
- downgrade_ai_recommendation_to_assist_only
- remove_private_notes_from_ai_context
- regenerate_gap_prompt_from_public_screening_fields
- resolve_reviewer_conflict_before_ai_release
- rescreen_against_locked_eligibility_version
- complete_pico_and_study_design_criteria
- attach_full_text_evidence_for_exclusion
- map_exclusion_to_approved_reason_taxonomy
- assign_second_full_text_reviewer
- attach_full_text_retrieval_evidence
- require_human_approval_for_screening_release
- assign_second_title_abstract_reviewer
- select_canonical_record_for_duplicate_cluster
- record_full_text_locator_and_hash
- attach_limitation_signals_to_gap_prompt
- add_more_screened_study_evidence_before_surfacing_gap
- refresh_search_snapshot_before_gap_generation

## Top Findings
- CRITICAL AI_POLICY_AUTHORITY_TOO_BROAD: AI assistant policy allows actions beyond assist-only recommendations.
- CRITICAL AI_SCREENING_OVERRIDE_WITHOUT_APPROVAL: SR-100 has an AI screening recommendation that can override or apply without human approval.
- CRITICAL PRIVATE_REVIEW_NOTE_EXPORTED: SR-100 exports private reviewer notes into the AI assistant packet.
- CRITICAL PRIVATE_REVIEW_NOTE_IN_GAP_PROMPT: gap-adolescent-ai-coaching includes private reviewer-note content.
- CRITICAL UNRESOLVED_SCREENING_CONFLICT: SR-100 has an unresolved full/text screening conflict.
- HIGH CRITERIA_VERSION_DRIFT: SR-100 was screened against eligibility-v2 instead of eligibility-v3.
- HIGH ELIGIBILITY_CRITERIA_INCOMPLETE: Eligibility criteria are missing required fields: outcome, studyDesign.
- HIGH EXCLUSION_EVIDENCE_MISSING: SR-100 exclusion reason low_quality lacks full-text evidence locator and quote.
