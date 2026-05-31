"use strict";

function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function parseDate(value) {
  const raw = String(value || "");
  const date = new Date(raw.includes("T") ? raw : `${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(startValue, endValue) {
  const start = parseDate(startValue);
  const end = parseDate(endValue);
  if (!start || !end) return null;
  return Math.ceil((end.getTime() - start.getTime()) / 86400000);
}

function inDateWindow(value, startValue, endValue, graceDays = 0) {
  const date = parseDate(value);
  const start = parseDate(startValue);
  const end = parseDate(endValue);
  if (!date || !start || !end) return false;
  const graceMs = graceDays * 86400000;
  return date.getTime() >= start.getTime() - graceMs && date.getTime() <= end.getTime() + graceMs;
}

function buildFunderLookup(aliasCatalog = []) {
  const lookup = new Map();
  for (const funder of aliasCatalog) {
    const names = [funder.id, funder.name, ...(funder.aliases || [])];
    for (const name of names) {
      const key = normalizeText(name);
      if (key) lookup.set(key, funder.id);
    }
  }
  return lookup;
}

function resolveFunderId(funderName, aliasCatalog) {
  const lookup = buildFunderLookup(aliasCatalog);
  return lookup.get(normalizeText(funderName)) || null;
}

function hasRequiredAcknowledgement(record) {
  const text = normalizeText(record.acknowledgementText);
  const required = normalizeText(record.requiredAcknowledgement);
  return Boolean(required && text.includes(required));
}

function evaluateFundingRecord(record, context) {
  const findings = [];
  const policy = context.policy || {};
  const resolvedFunderId = resolveFunderId(record.funderName, context.aliasCatalog);
  const expectedFunderId = record.canonicalFunderId || resolvedFunderId;

  if (!record.awardId || !String(record.awardId).trim()) {
    findings.push({
      code: "MISSING_AWARD_ID",
      severity: "hold",
      message: `${record.id} is missing a grant or award identifier for graph publication.`,
    });
  }

  if (!resolvedFunderId) {
    findings.push({
      code: "UNKNOWN_FUNDER_ALIAS",
      severity: "hold",
      message: `${record.id} uses an unrecognized funder name: ${record.funderName}.`,
    });
  } else if (record.canonicalFunderId && resolvedFunderId !== record.canonicalFunderId) {
    findings.push({
      code: "FUNDER_ALIAS_CONFLICT",
      severity: "hold",
      message: `${record.id} resolves to ${resolvedFunderId}, not expected ${record.canonicalFunderId}.`,
    });
  }

  if (!hasRequiredAcknowledgement(record)) {
    findings.push({
      code: "MISSING_REQUIRED_ACKNOWLEDGEMENT",
      severity: "hold",
      message: `${record.id} lacks the required funding acknowledgement phrase.`,
    });
  }

  for (const output of record.outputs || []) {
    if (!output.doi || !String(output.doi).startsWith("10.")) {
      findings.push({
        code: "INVALID_OUTPUT_DOI",
        severity: "hold",
        message: `${record.id} has an output without a valid DOI-like identifier.`,
      });
    }

    if (output.projectId && output.projectId !== record.projectId) {
      findings.push({
        code: "DOI_PROJECT_MISMATCH",
        severity: "hold",
        message: `${record.id} links ${output.doi} to ${output.projectId}, not ${record.projectId}.`,
      });
    }

    if (!inDateWindow(output.publishedAt, record.awardStart, record.awardEnd, policy.outputGraceDays || 0)) {
      findings.push({
        code: "AWARD_WINDOW_MISMATCH",
        severity: "review",
        message: `${record.id} output ${output.doi} falls outside the award active window.`,
      });
    }
  }

  for (const edge of record.recommendationEdges || []) {
    if (edge.includesPrivateFunding && !edge.redactedFundingPath) {
      findings.push({
        code: "PRIVATE_FUNDER_PATH_EXPOSED",
        severity: "hold",
        message: `${record.id} exposes a private funding path in recommendation edge ${edge.edgeId}.`,
      });
    }
    if (edge.conflictOfInterest && !edge.curatorReview) {
      findings.push({
        code: "COI_RECOMMENDATION_NEEDS_REVIEW",
        severity: "review",
        message: `${record.id} recommendation edge ${edge.edgeId} has an unresolved conflict-of-interest flag.`,
      });
    }
  }

  const highestSeverity = findings.some((finding) => finding.severity === "hold")
    ? "hold"
    : findings.some((finding) => finding.severity === "review")
      ? "review"
      : "release";

  return {
    recordId: record.id,
    projectId: record.projectId,
    awardId: record.awardId || null,
    resolvedFunderId: expectedFunderId,
    decision: highestSeverity,
    graphAction: highestSeverity === "release" ? "publish funding graph edges" : highestSeverity === "review" ? "route to curator review" : "block graph publication",
    findings,
  };
}

function summarize(decisions) {
  return decisions.reduce(
    (summary, item) => {
      summary.records += 1;
      summary[item.decision] += 1;
      summary.findings += item.findings.length;
      return summary;
    },
    { records: 0, release: 0, review: 0, hold: 0, findings: 0 },
  );
}

function analyzeFundingAwardGraph(input = {}) {
  const context = {
    checkedAt: input.checkedAt || new Date(0).toISOString(),
    aliasCatalog: input.aliasCatalog || [],
    policy: input.policy || {},
  };
  const records = input.records || [];
  const decisions = records.map((record) => evaluateFundingRecord(record, context));
  const summary = summarize(decisions);
  const status = summary.hold > 0 ? "hold" : summary.review > 0 ? "review" : "release";

  return {
    generatedAt: context.checkedAt,
    status,
    summary,
    decisions,
    warnings: records.length ? [] : [{ code: "NO_FUNDING_RECORDS", message: "No funding graph records were supplied." }],
  };
}

module.exports = {
  analyzeFundingAwardGraph,
  buildFunderLookup,
  daysBetween,
  evaluateFundingRecord,
  hasRequiredAcknowledgement,
  inDateWindow,
  normalizeText,
  resolveFunderId,
};
