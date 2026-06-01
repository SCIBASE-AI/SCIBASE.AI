const crypto = require("node:crypto");

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

function toDate(value) {
  const parsed = new Date(value || "");
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysBetween(laterValue, earlierValue) {
  const later = toDate(laterValue);
  const earlier = toDate(earlierValue);
  if (!later || !earlier) {
    return null;
  }
  return Math.floor((later.getTime() - earlier.getTime()) / (24 * 60 * 60 * 1000));
}

function severityRank(severity) {
  return { critical: 4, high: 3, medium: 2, low: 1 }[severity] || 0;
}

function addFinding(findings, severity, code, message, refs, action) {
  findings.push({
    severity,
    code,
    message,
    refs: asArray(refs),
    action
  });
}

function unique(values) {
  return [...new Set(asArray(values).filter(Boolean))];
}

function normalizedSet(values) {
  return new Set(asArray(values).map((value) => String(value || "").trim().toLowerCase()).filter(Boolean));
}

function missingRequired(required, actual) {
  const actualSet = normalizedSet(actual);
  return asArray(required).filter((value) => !actualSet.has(String(value).toLowerCase()));
}

function reviewerCount(decisions) {
  return normalizedSet(asArray(decisions).map((decision) => decision.reviewer)).size;
}

function stageDecisions(study, stage) {
  return asArray(study.decisions).filter((decision) => decision.stage === stage);
}

function shouldReviewFullText(study) {
  return study.fullTextRequired !== false && study.screeningOutcome !== "title_abstract_excluded";
}

function isAiOverride(recommendation) {
  return recommendation.applied === true || recommendation.authority !== "assist_only";
}

function evaluateSystematicReviewScreening(packet) {
  const findings = [];
  const reviewDate = packet.reviewDate || new Date().toISOString().slice(0, 10);
  const eligibility = packet.eligibilityCriteria || {};
  const taxonomy = new Map(asArray(packet.exclusionTaxonomy).map((reason) => [reason.id, reason]));
  const studies = asArray(packet.studies);
  const requiredCriteriaFields = ["population", "intervention", "comparator", "outcome", "studyDesign"];
  const studySummaries = [];

  if (!eligibility.version) {
    addFinding(
      findings,
      "critical",
      "ELIGIBILITY_VERSION_MISSING",
      "The systematic review packet has no locked eligibility-criteria version.",
      [packet.reviewId || "review"],
      "lock_eligibility_criteria_before_ai_screening"
    );
  }

  const missingCriteria = missingRequired(requiredCriteriaFields, Object.keys(eligibility.fields || {}));
  if (missingCriteria.length > 0) {
    addFinding(
      findings,
      "high",
      "ELIGIBILITY_CRITERIA_INCOMPLETE",
      `Eligibility criteria are missing required fields: ${missingCriteria.join(", ")}.`,
      [eligibility.version || packet.reviewId || "eligibility"],
      "complete_pico_and_study_design_criteria"
    );
  }

  const searchAge = daysBetween(reviewDate, packet.searchSnapshot && packet.searchSnapshot.capturedAt);
  if (searchAge === null || searchAge > Number(packet.maxSearchSnapshotAgeDays || 30)) {
    addFinding(
      findings,
      "medium",
      "SEARCH_SNAPSHOT_STALE",
      `Search snapshot is ${searchAge === null ? "missing" : `${searchAge} days old`} for ${packet.reviewId || "review"}.`,
      [packet.searchSnapshot && packet.searchSnapshot.id || "search-snapshot"],
      "refresh_search_snapshot_before_gap_generation"
    );
  }

  const aiPolicy = packet.aiPolicy || {};
  if (aiPolicy.actionAuthority !== "assist_only") {
    addFinding(
      findings,
      "critical",
      "AI_POLICY_AUTHORITY_TOO_BROAD",
      "AI assistant policy allows actions beyond assist-only recommendations.",
      [packet.reviewId || "review"],
      "set_ai_policy_to_assist_only"
    );
  }
  if (aiPolicy.humanApprovalRequired !== true) {
    addFinding(
      findings,
      "high",
      "HUMAN_APPROVAL_GATE_MISSING",
      "AI screening output can be released without an explicit human approval gate.",
      [packet.reviewId || "review"],
      "require_human_approval_for_screening_release"
    );
  }

  if (studies.length === 0) {
    addFinding(
      findings,
      "critical",
      "NO_STUDIES_TO_SCREEN",
      "No studies were supplied to the screening assistant.",
      [packet.reviewId || "review"],
      "attach_screening_records_before_assistant_run"
    );
  }

  for (const study of studies) {
    const refs = [study.id || "study"];
    const summary = {
      id: study.id,
      outcome: study.screeningOutcome || "unknown",
      requiredActions: [],
      titleAbstractReviewers: reviewerCount(stageDecisions(study, "title_abstract")),
      fullTextReviewers: reviewerCount(stageDecisions(study, "full_text"))
    };

    if (study.criteriaVersion !== eligibility.version) {
      addFinding(
        findings,
        "high",
        "CRITERIA_VERSION_DRIFT",
        `${study.id || "Study"} was screened against ${study.criteriaVersion || "no criteria version"} instead of ${eligibility.version || "the locked version"}.`,
        refs,
        "rescreen_against_locked_eligibility_version"
      );
      summary.requiredActions.push("rescreen_against_locked_eligibility_version");
    }

    if (summary.titleAbstractReviewers < 2) {
      addFinding(
        findings,
        "high",
        "TITLE_ABSTRACT_DUAL_REVIEW_GAP",
        `${study.id || "Study"} does not have two independent title/abstract reviewers.`,
        refs,
        "assign_second_title_abstract_reviewer"
      );
      summary.requiredActions.push("assign_second_title_abstract_reviewer");
    }

    if (shouldReviewFullText(study) && summary.fullTextReviewers < 2) {
      addFinding(
        findings,
        "high",
        "FULL_TEXT_DUAL_REVIEW_GAP",
        `${study.id || "Study"} does not have two independent full-text reviewers.`,
        refs,
        "assign_second_full_text_reviewer"
      );
      summary.requiredActions.push("assign_second_full_text_reviewer");
    }

    for (const [stage, consensus] of Object.entries(study.consensus || {})) {
      if (consensus && consensus.state === "conflict" && !consensus.resolution) {
        addFinding(
          findings,
          "critical",
          "UNRESOLVED_SCREENING_CONFLICT",
          `${study.id || "Study"} has an unresolved ${stage.replace("_", "/")} screening conflict.`,
          refs,
          "resolve_reviewer_conflict_before_ai_release"
        );
        summary.requiredActions.push("resolve_reviewer_conflict_before_ai_release");
      }
    }

    if (shouldReviewFullText(study)) {
      if (!study.fullText || !study.fullText.retrievedAt) {
        addFinding(
          findings,
          "high",
          "FULL_TEXT_RETRIEVAL_MISSING",
          `${study.id || "Study"} reached full-text screening without retrieval evidence.`,
          refs,
          "attach_full_text_retrieval_evidence"
        );
        summary.requiredActions.push("attach_full_text_retrieval_evidence");
      } else if (!study.fullText.hash || !study.fullText.locator) {
        addFinding(
          findings,
          "medium",
          "FULL_TEXT_PROVENANCE_GAP",
          `${study.id || "Study"} full-text evidence is missing a locator or content hash.`,
          refs,
          "record_full_text_locator_and_hash"
        );
      }
    }

    if (study.duplicateGroup && !study.duplicateGroup.canonicalStudyId) {
      addFinding(
        findings,
        "medium",
        "DUPLICATE_CLUSTER_CANONICAL_MISSING",
        `${study.id || "Study"} is in duplicate cluster ${study.duplicateGroup.id || "unknown"} without a canonical record.`,
        refs,
        "select_canonical_record_for_duplicate_cluster"
      );
    }

    if (study.screeningOutcome === "excluded") {
      const reasons = asArray(study.exclusionReasons);
      if (reasons.length === 0) {
        addFinding(
          findings,
          "high",
          "EXCLUSION_REASON_MISSING",
          `${study.id || "Study"} is excluded without a structured exclusion reason.`,
          refs,
          "select_taxonomy_backed_exclusion_reason"
        );
      }
      for (const reason of reasons) {
        const taxonomyReason = taxonomy.get(reason.id);
        if (!taxonomyReason) {
          addFinding(
            findings,
            "high",
            "EXCLUSION_REASON_NOT_IN_TAXONOMY",
            `${study.id || "Study"} uses exclusion reason ${reason.id || "unknown"}, which is not in the approved taxonomy.`,
            refs,
            "map_exclusion_to_approved_reason_taxonomy"
          );
        }
        if (!reason.evidenceLocator || !reason.evidenceQuote) {
          addFinding(
            findings,
            "high",
            "EXCLUSION_EVIDENCE_MISSING",
            `${study.id || "Study"} exclusion reason ${reason.id || "unknown"} lacks full-text evidence locator and quote.`,
            refs,
            "attach_full_text_evidence_for_exclusion"
          );
        }
      }
    }

    if (asArray(study.aiRecommendations).some(isAiOverride) && study.humanApproved !== true) {
      addFinding(
        findings,
        "critical",
        "AI_SCREENING_OVERRIDE_WITHOUT_APPROVAL",
        `${study.id || "Study"} has an AI screening recommendation that can override or apply without human approval.`,
        refs,
        "downgrade_ai_recommendation_to_assist_only"
      );
      summary.requiredActions.push("downgrade_ai_recommendation_to_assist_only");
    }

    if (asArray(study.reviewerNotes).some((note) => note.private === true && note.exportedToAssistant === true)) {
      addFinding(
        findings,
        "critical",
        "PRIVATE_REVIEW_NOTE_EXPORTED",
        `${study.id || "Study"} exports private reviewer notes into the AI assistant packet.`,
        refs,
        "remove_private_notes_from_ai_context"
      );
      summary.requiredActions.push("remove_private_notes_from_ai_context");
    }

    studySummaries.push({
      ...summary,
      requiredActions: unique(summary.requiredActions)
    });
  }

  const minGapEvidenceStudies = Number(packet.minGapEvidenceStudies || 3);
  const gapPrompts = asArray(packet.gapPrompts).map((prompt) => {
    const refs = [prompt.id || "gap-prompt"];
    if (asArray(prompt.evidenceStudyIds).length < minGapEvidenceStudies) {
      addFinding(
        findings,
        "medium",
        "GAP_PROMPT_UNDER_EVIDENCED",
        `${prompt.id || "Gap prompt"} cites fewer than ${minGapEvidenceStudies} screened studies.`,
        refs,
        "add_more_screened_study_evidence_before_surfacing_gap"
      );
    }
    if (asArray(prompt.limitationSignals).length === 0) {
      addFinding(
        findings,
        "medium",
        "GAP_PROMPT_LIMITATION_SIGNALS_MISSING",
        `${prompt.id || "Gap prompt"} has no limitation signals from excluded or unresolved studies.`,
        refs,
        "attach_limitation_signals_to_gap_prompt"
      );
    }
    if (prompt.includesPrivateReviewerNote === true) {
      addFinding(
        findings,
        "critical",
        "PRIVATE_REVIEW_NOTE_IN_GAP_PROMPT",
        `${prompt.id || "Gap prompt"} includes private reviewer-note content.`,
        refs,
        "regenerate_gap_prompt_from_public_screening_fields"
      );
    }
    return {
      id: prompt.id,
      evidenceStudyCount: asArray(prompt.evidenceStudyIds).length,
      limitationSignalCount: asArray(prompt.limitationSignals).length,
      readyForRelease: asArray(prompt.evidenceStudyIds).length >= minGapEvidenceStudies &&
        asArray(prompt.limitationSignals).length > 0 &&
        prompt.includesPrivateReviewerNote !== true
    };
  });

  const highOrCriticalFindings = findings.filter((finding) => severityRank(finding.severity) >= severityRank("high")).length;
  const criticalFindings = findings.filter((finding) => finding.severity === "critical").length;
  const decision = criticalFindings > 0
    ? "hold_systematic_review_assistant"
    : highOrCriticalFindings > 0
      ? "revise_screening_packet"
      : "release_systematic_review_assistant";

  const sortedFindings = findings.sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.code.localeCompare(b.code));
  const recommendations = unique(sortedFindings.map((finding) => finding.action));
  const auditDigest = `sha256:${sha256({
    reviewId: packet.reviewId,
    inputDigest: sha256(packet),
    decision,
    findingCodes: sortedFindings.map((finding) => finding.code),
    recommendations
  })}`;

  return {
    summary: {
      reviewId: packet.reviewId || "systematic-review",
      decision,
      findingCount: sortedFindings.length,
      highOrCriticalFindings,
      criticalFindings,
      studiesReviewed: studies.length,
      gapPromptsReviewed: gapPrompts.length,
      auditDigest
    },
    findings: sortedFindings,
    studySummaries,
    gapPrompts,
    recommendations
  };
}

module.exports = {
  evaluateSystematicReviewScreening,
  sha256
};
