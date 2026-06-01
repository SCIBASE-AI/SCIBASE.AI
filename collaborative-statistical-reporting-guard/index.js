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

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
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

function numericSources(values) {
  return Object.entries(values || {})
    .map(([source, value]) => ({ source, value: toNumber(value) }))
    .filter((entry) => entry.value !== null);
}

function maxDelta(entries) {
  if (entries.length < 2) {
    return 0;
  }
  const values = entries.map((entry) => entry.value);
  return Math.max(...values) - Math.min(...values);
}

function approxEqual(left, right, tolerance) {
  const leftNumber = toNumber(left);
  const rightNumber = toNumber(right);
  if (leftNumber === null || rightNumber === null) {
    return false;
  }
  return Math.abs(leftNumber - rightNumber) <= tolerance;
}

function ciEqual(left, right, tolerance) {
  if (!left || !right) {
    return false;
  }
  return approxEqual(left.low, right.low, tolerance) && approxEqual(left.high, right.high, tolerance);
}

function ciCrossesZero(interval) {
  const low = toNumber(interval && interval.low);
  const high = toNumber(interval && interval.high);
  return low !== null && high !== null && low <= 0 && high >= 0;
}

function normalizePhrase(value) {
  return String(value || "").toLowerCase();
}

function phraseSaysSignificant(phrase) {
  const text = normalizePhrase(phrase);
  if (phraseSaysNotSignificant(text)) {
    return false;
  }
  return text.includes("significant") || text.includes("p <") || text.includes("p<");
}

function phraseSaysNotSignificant(phrase) {
  const text = normalizePhrase(phrase);
  return /\bnot\b.{0,30}\bsignificant\b/.test(text)
    || text.includes("non-significant")
    || text.includes("nonsignificant")
    || text.includes("p >")
    || text.includes("p>");
}

function daysBetween(laterValue, earlierValue) {
  const later = toDate(laterValue);
  const earlier = toDate(earlierValue);
  if (!later || !earlier) {
    return null;
  }
  return Math.floor((later.getTime() - earlier.getTime()) / (24 * 60 * 60 * 1000));
}

function evaluateAnalysis(analysis, policy, reviewDate, findings) {
  const refs = [analysis.id || "analysis"];
  const requiredActions = [];
  const summary = {
    id: analysis.id,
    label: analysis.label || analysis.id,
    sectionId: analysis.sectionId || "unknown-section",
    status: "export_ready",
    sampleSizeDelta: 0,
    requiredActions
  };

  const sampleEntries = numericSources(analysis.sampleSizes);
  if (sampleEntries.length < Number(policy.requiredSampleSizeSources || 2)) {
    addFinding(
      findings,
      "high",
      "SAMPLE_SIZE_SOURCE_MISSING",
      `${analysis.id || "Analysis"} has fewer than ${policy.requiredSampleSizeSources || 2} sample-size sources.`,
      refs,
      "add_text_table_or_figure_sample_size_evidence"
    );
    requiredActions.push("add_text_table_or_figure_sample_size_evidence");
  }

  const sampleDelta = maxDelta(sampleEntries);
  summary.sampleSizeDelta = sampleDelta;
  if (sampleDelta > Number(policy.sampleSizeTolerance || 0)) {
    addFinding(
      findings,
      "critical",
      "SAMPLE_SIZE_DRIFT",
      `${analysis.id || "Analysis"} reports inconsistent sample sizes across manuscript surfaces.`,
      refs.concat(sampleEntries.map((entry) => entry.source)),
      "reconcile_sample_size_text_table_and_figure"
    );
    requiredActions.push("reconcile_sample_size_text_table_and_figure");
  }

  const pValue = toNumber(analysis.pValue && analysis.pValue.reported);
  if (pValue === null) {
    addFinding(
      findings,
      "medium",
      "P_VALUE_MISSING",
      `${analysis.id || "Analysis"} has no structured p-value for export validation.`,
      refs,
      "attach_structured_p_value_or_mark_descriptive_only"
    );
    requiredActions.push("attach_structured_p_value_or_mark_descriptive_only");
  } else {
    const alpha = Number(policy.alpha || 0.05);
    const phrase = analysis.pValue && analysis.pValue.wording;
    if (pValue < alpha && phraseSaysNotSignificant(phrase)) {
      addFinding(
        findings,
        "high",
        "P_VALUE_WORDING_CONTRADICTION",
        `${analysis.id || "Analysis"} has p=${pValue} but the manuscript wording says not significant.`,
        refs,
        "align_p_value_threshold_wording"
      );
      requiredActions.push("align_p_value_threshold_wording");
    }
    if (pValue >= alpha && phraseSaysSignificant(phrase)) {
      addFinding(
        findings,
        "high",
        "P_VALUE_WORDING_CONTRADICTION",
        `${analysis.id || "Analysis"} has p=${pValue} but the manuscript wording says significant.`,
        refs,
        "align_p_value_threshold_wording"
      );
      requiredActions.push("align_p_value_threshold_wording");
    }
    if (analysis.pValue && toNumber(analysis.pValue.table) !== null && !approxEqual(pValue, analysis.pValue.table, Number(policy.pValueTolerance || 0.0005))) {
      addFinding(
        findings,
        "high",
        "P_VALUE_TABLE_MISMATCH",
        `${analysis.id || "Analysis"} has different text and table p-values.`,
        refs,
        "sync_text_and_table_p_values"
      );
      requiredActions.push("sync_text_and_table_p_values");
    }
  }

  if (analysis.effectSize) {
    const tolerance = Number(policy.effectSizeTolerance || 0.01);
    if (toNumber(analysis.effectSize.text) === null || toNumber(analysis.effectSize.table) === null) {
      addFinding(
        findings,
        "medium",
        "EFFECT_SIZE_SOURCE_MISSING",
        `${analysis.id || "Analysis"} lacks a paired text/table effect-size value.`,
        refs,
        "add_effect_size_to_text_and_table"
      );
      requiredActions.push("add_effect_size_to_text_and_table");
    } else if (!approxEqual(analysis.effectSize.text, analysis.effectSize.table, tolerance)) {
      addFinding(
        findings,
        "high",
        "EFFECT_SIZE_MISMATCH",
        `${analysis.id || "Analysis"} has inconsistent effect sizes in text and table.`,
        refs,
        "reconcile_effect_size_text_and_table"
      );
      requiredActions.push("reconcile_effect_size_text_and_table");
    }
  }

  if (analysis.confidenceInterval) {
    const tolerance = Number(policy.confidenceIntervalTolerance || 0.01);
    if (!ciEqual(analysis.confidenceInterval.text, analysis.confidenceInterval.table, tolerance)) {
      addFinding(
        findings,
        "high",
        "CONFIDENCE_INTERVAL_MISMATCH",
        `${analysis.id || "Analysis"} has inconsistent confidence intervals in text and table.`,
        refs,
        "reconcile_confidence_interval_text_and_table"
      );
      requiredActions.push("reconcile_confidence_interval_text_and_table");
    }
    if (analysis.pValue && toNumber(analysis.pValue.reported) !== null) {
      const crossesZero = ciCrossesZero(analysis.confidenceInterval.text);
      const saysSignificant = phraseSaysSignificant(analysis.pValue.wording);
      if (crossesZero && saysSignificant) {
        addFinding(
          findings,
          "medium",
          "CI_SIGNIFICANCE_WORDING_CONFLICT",
          `${analysis.id || "Analysis"} confidence interval crosses zero while wording says significant.`,
          refs,
          "review_ci_and_statistical_significance_wording"
        );
        requiredActions.push("review_ci_and_statistical_significance_wording");
      }
    }
  }

  if (analysis.figureStatistic) {
    if (!analysis.figureStatistic.figureId || toNumber(analysis.figureStatistic.value) === null) {
      addFinding(
        findings,
        "medium",
        "FIGURE_STATISTIC_INCOMPLETE",
        `${analysis.id || "Analysis"} has incomplete figure statistic metadata.`,
        refs,
        "attach_figure_statistic_value_and_anchor"
      );
      requiredActions.push("attach_figure_statistic_value_and_anchor");
    } else if (analysis.effectSize && toNumber(analysis.effectSize.text) !== null && !approxEqual(analysis.figureStatistic.value, analysis.effectSize.text, Number(policy.figureStatisticTolerance || 0.02))) {
      addFinding(
        findings,
        "medium",
        "FIGURE_TEXT_STATISTIC_MISMATCH",
        `${analysis.id || "Analysis"} figure statistic differs from the manuscript effect size.`,
        refs.concat([analysis.figureStatistic.figureId]),
        "sync_figure_statistic_with_text_and_table"
      );
      requiredActions.push("sync_figure_statistic_with_text_and_table");
    }
  }

  const locked = analysis.lockedSection || {};
  if (locked.locked === true) {
    const editAge = daysBetween(locked.approvedAt, locked.lastStatisticEditAt);
    if (!locked.approvedAt || editAge === null || editAge < 0) {
      addFinding(
        findings,
        "critical",
        "LOCKED_SECTION_STAT_EDIT_UNAPPROVED",
        `${analysis.id || "Analysis"} changed statistics inside a locked section without approval.`,
        refs.concat([locked.sectionId || analysis.sectionId || "section"]),
        "approve_or_revert_locked_section_statistical_edit"
      );
      requiredActions.push("approve_or_revert_locked_section_statistical_edit");
    }
  }

  for (const comment of asArray(analysis.reviewerComments)) {
    if (comment.blocking === true && !comment.resolvedAt) {
      addFinding(
        findings,
        "high",
        "BLOCKING_STAT_REVIEW_COMMENT_OPEN",
        `${analysis.id || "Analysis"} has unresolved blocking statistical review comment ${comment.id || "unknown"}.`,
        refs.concat([comment.id || "comment"]),
        "resolve_blocking_statistical_review_comment"
      );
      requiredActions.push("resolve_blocking_statistical_review_comment");
    }
  }

  if (requiredActions.length > 0) {
    summary.status = requiredActions.some((action) => action.includes("reconcile") || action.includes("locked_section"))
      ? "hold_collaborative_export"
      : "needs_statistical_review";
  }

  return summary;
}

function evaluateStatisticalReporting(packet) {
  const findings = [];
  const reviewDate = packet.reviewDate || new Date().toISOString().slice(0, 10);
  const policy = {
    alpha: 0.05,
    requiredSampleSizeSources: 2,
    sampleSizeTolerance: 0,
    pValueTolerance: 0.0005,
    effectSizeTolerance: 0.01,
    confidenceIntervalTolerance: 0.01,
    figureStatisticTolerance: 0.02,
    ...(packet.policy || {})
  };
  const analyses = asArray(packet.analyses).map((analysis) => evaluateAnalysis(analysis, policy, reviewDate, findings));
  const criticalFindings = findings.filter((finding) => finding.severity === "critical").length;
  const highOrCriticalFindings = findings.filter((finding) => severityRank(finding.severity) >= severityRank("high")).length;
  const heldAnalyses = analyses.filter((analysis) => analysis.status === "hold_collaborative_export").length;
  let decision = "release_collaborative_export";

  if (criticalFindings > 0 || heldAnalyses > 0) {
    decision = "hold_collaborative_export";
  } else if (highOrCriticalFindings > 0) {
    decision = "route_to_statistical_review";
  }

  const auditSubject = {
    manuscriptId: packet.manuscriptId,
    reviewDate,
    policy,
    analyses,
    findingCodes: findings.map((finding) => finding.code).sort()
  };

  return {
    summary: {
      decision,
      manuscriptId: packet.manuscriptId || "manuscript",
      analysesReviewed: analyses.length,
      heldAnalyses,
      findingCount: findings.length,
      criticalFindings,
      highOrCriticalFindings,
      auditDigest: `sha256:${sha256(auditSubject)}`
    },
    analyses,
    findings: findings.sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.code.localeCompare(b.code))
  };
}

module.exports = {
  evaluateStatisticalReporting,
  sha256
};
