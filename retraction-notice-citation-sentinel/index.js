const crypto = require("crypto");

const NOTICE_RULES = {
  retracted: {
    severity: "blocker",
    gate: "quarantine",
    weight: 45,
    label: "Retracted evidence",
    action: "Replace or remove the citation before this claim is included in reviewer packets."
  },
  withdrawn: {
    severity: "blocker",
    gate: "quarantine",
    weight: 45,
    label: "Withdrawn evidence",
    action: "Replace or remove the withdrawn citation before this claim is included in reviewer packets."
  },
  expression_of_concern: {
    severity: "high",
    gate: "review",
    weight: 24,
    label: "Expression of concern",
    action: "Add a reviewer-visible caveat and find an independent supporting source."
  },
  major_correction: {
    severity: "medium",
    gate: "revise",
    weight: 18,
    label: "Major correction",
    action: "Update the claim text and evidence summary to reflect the corrected record."
  },
  superseded_preprint: {
    severity: "medium",
    gate: "revise",
    weight: 14,
    label: "Superseded preprint",
    action: "Cite the final publication or explain why the older preprint remains necessary."
  },
  active: {
    severity: "info",
    gate: "pass",
    weight: 0,
    label: "Active",
    action: "No publication-notice action required."
  }
};

const SEVERITY_ORDER = {
  blocker: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4
};

function buildSentinelReport(project, options = {}) {
  validateProject(project);

  const checkedAt = options.checkedAt || "2026-05-22T00:00:00.000Z";
  const claimsById = new Map(project.claims.map((claim) => [claim.id, claim]));
  const referenceFindings = project.references.map((reference) =>
    evaluateReference(reference, project.claims, claimsById)
  );
  const claimDecisions = project.claims.map((claim) =>
    evaluateClaim(claim, referenceFindings)
  );
  const reviewerActions = buildReviewerActions(referenceFindings, claimDecisions);
  const summary = summarize(referenceFindings, claimDecisions);
  const releaseGate = buildReleaseGate(summary, reviewerActions);
  const researchGaps = buildResearchGaps(referenceFindings, claimDecisions);
  const noticeRegistryFingerprint = digest({
    references: project.references.map((reference) => ({
      id: reference.id,
      status: normalizeNoticeType(reference.status),
      notice: reference.notice || null,
      replacement: reference.replacement || null
    }))
  });

  const report = {
    project: {
      id: project.id,
      title: project.title,
      domain: project.domain,
      manuscriptVersion: project.manuscriptVersion
    },
    checkedAt,
    releaseGate,
    summary,
    referenceFindings,
    claimDecisions,
    reviewerActions,
    researchGaps,
    reproducibilityContext: {
      dataPolicy: "synthetic fixture only",
      noticeRegistryFingerprint,
      deterministic: true,
      externalNetworkCalls: 0
    }
  };

  report.auditDigest = digest(report);
  return report;
}

function validateProject(project) {
  if (!project || typeof project !== "object") {
    throw new TypeError("project must be an object");
  }
  if (!Array.isArray(project.claims) || project.claims.length === 0) {
    throw new Error("project.claims must be a non-empty array");
  }
  if (!Array.isArray(project.references) || project.references.length === 0) {
    throw new Error("project.references must be a non-empty array");
  }
  for (const claim of project.claims) {
    if (!claim.id || !Array.isArray(claim.citationIds)) {
      throw new Error("each claim requires an id and citationIds array");
    }
  }
  for (const reference of project.references) {
    if (!reference.id || !reference.title) {
      throw new Error("each reference requires an id and title");
    }
  }
}

function evaluateReference(reference, claims, claimsById) {
  const noticeType = normalizeNoticeType(reference.status || (reference.notice && reference.notice.type));
  const rule = NOTICE_RULES[noticeType] || NOTICE_RULES.active;
  const impactedClaims = findImpactedClaims(reference, claims, claimsById);
  const primaryUse = reference.evidenceRole === "primary" ||
    impactedClaims.some((claim) => claim.evidenceRole === "primary");
  const severity = primaryUse && rule.severity === "high" ? "blocker" : rule.severity;
  const gate = severity === "blocker" ? "quarantine" : rule.gate;

  return {
    referenceId: reference.id,
    title: reference.title,
    doi: reference.doi || null,
    noticeType,
    noticeDate: reference.notice ? reference.notice.date : null,
    noticeSource: reference.notice ? reference.notice.source : null,
    noticeReason: reference.notice ? reference.notice.reason : null,
    severity,
    gate,
    evidenceRole: reference.evidenceRole || "supporting",
    impactedClaimIds: impactedClaims.map((claim) => claim.id),
    impactSummary: buildImpactSummary(reference, noticeType, impactedClaims, primaryUse),
    replacement: reference.replacement || null,
    assertedEffect: reference.assertedEffect || null,
    correctedEffect: reference.correctedEffect || null,
    remediation: buildReferenceRemediation(reference, noticeType, rule, primaryUse)
  };
}

function normalizeNoticeType(type) {
  const value = String(type || "active").toLowerCase().replace(/[\s-]+/g, "_");
  if (value === "retraction") return "retracted";
  if (value === "withdrawal") return "withdrawn";
  if (value === "correction" || value === "erratum") return "major_correction";
  if (value === "preprint_superseded") return "superseded_preprint";
  return NOTICE_RULES[value] ? value : "active";
}

function findImpactedClaims(reference, claims, claimsById) {
  const linkedIds = new Set(reference.supportsClaimIds || []);
  for (const claim of claims) {
    if (claim.citationIds.includes(reference.id)) {
      linkedIds.add(claim.id);
    }
  }
  return [...linkedIds]
    .map((id) => claimsById.get(id))
    .filter(Boolean)
    .sort((left, right) => left.id.localeCompare(right.id));
}

function buildImpactSummary(reference, noticeType, impactedClaims, primaryUse) {
  if (noticeType === "active") {
    return "No publication notice found for cited evidence.";
  }
  const claimText = impactedClaims.length === 1 ? "1 claim" : `${impactedClaims.length} claims`;
  const roleText = primaryUse ? "primary evidence" : "supporting evidence";
  if (noticeType === "major_correction" && reference.correctedEffect) {
    return `${claimText} depend on ${roleText} with a corrected effect: ${reference.correctedEffect}.`;
  }
  if (noticeType === "superseded_preprint" && reference.replacement) {
    return `${claimText} cite ${roleText} superseded by ${reference.replacement.doi}.`;
  }
  return `${claimText} depend on ${roleText} with notice type ${noticeType}.`;
}

function buildReferenceRemediation(reference, noticeType, rule, primaryUse) {
  if (noticeType === "active") {
    return rule.action;
  }
  const parts = [rule.action];
  if (primaryUse && (noticeType === "retracted" || noticeType === "withdrawn" || noticeType === "expression_of_concern")) {
    parts.push("Mark dependent claims as blocked until independent evidence is attached.");
  } else if (primaryUse) {
    parts.push("Require reviewer signoff before retaining this primary evidence.");
  }
  if (reference.replacement) {
    parts.push(`Review replacement record ${reference.replacement.doi}.`);
  }
  if (reference.correctedEffect) {
    parts.push(`Revise any quantitative wording to ${reference.correctedEffect}.`);
  }
  return parts.join(" ");
}

function evaluateClaim(claim, referenceFindings) {
  const linkedFindings = referenceFindings.filter((finding) =>
    finding.impactedClaimIds.includes(claim.id)
  );
  const worst = linkedFindings
    .slice()
    .sort((left, right) => SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity])[0];
  const blockers = linkedFindings.filter((finding) => finding.severity === "blocker");
  const warnings = linkedFindings.filter((finding) =>
    finding.severity === "high" || finding.severity === "medium"
  );

  let status = "pass";
  if (blockers.length > 0) {
    status = "quarantine";
  } else if (warnings.length > 0) {
    status = "revise";
  }

  return {
    claimId: claim.id,
    section: claim.section || "Unspecified",
    text: claim.text,
    releaseImpact: claim.releaseImpact || "unspecified",
    status,
    topRisk: worst ? worst.noticeType : "active",
    citedReferenceIds: claim.citationIds.slice().sort(),
    blockedByReferenceIds: blockers.map((finding) => finding.referenceId).sort(),
    warningReferenceIds: warnings.map((finding) => finding.referenceId).sort(),
    assistantInstruction: buildClaimInstruction(status, claim, blockers, warnings)
  };
}

function buildClaimInstruction(status, claim, blockers, warnings) {
  if (status === "quarantine") {
    return `Do not show claim ${claim.id} in author-facing acceptance language until ${blockers.map((finding) => finding.referenceId).join(", ")} is replaced.`;
  }
  if (status === "revise") {
    return `Show claim ${claim.id} with reviewer-visible caveats for ${warnings.map((finding) => finding.referenceId).join(", ")}.`;
  }
  return `Claim ${claim.id} can proceed through the publication-notice gate.`;
}

function buildReviewerActions(referenceFindings, claimDecisions) {
  const actions = [];

  for (const finding of referenceFindings) {
    if (finding.severity === "info") continue;
    actions.push({
      priority: finding.severity,
      referenceId: finding.referenceId,
      claimIds: finding.impactedClaimIds,
      title: `${NOTICE_RULES[finding.noticeType].label}: ${finding.referenceId}`,
      action: finding.remediation
    });
  }

  for (const claim of claimDecisions) {
    if (claim.status === "quarantine") {
      actions.push({
        priority: "blocker",
        referenceId: null,
        claimIds: [claim.claimId],
        title: `Quarantine dependent claim ${claim.claimId}`,
        action: claim.assistantInstruction
      });
    }
  }

  return actions.sort((left, right) => {
    const severityDelta = SEVERITY_ORDER[left.priority] - SEVERITY_ORDER[right.priority];
    if (severityDelta !== 0) return severityDelta;
    return left.title.localeCompare(right.title);
  });
}

function summarize(referenceFindings, claimDecisions) {
  const bySeverity = { blocker: 0, high: 0, medium: 0, low: 0, info: 0 };
  const byNoticeType = {};
  for (const finding of referenceFindings) {
    bySeverity[finding.severity] += 1;
    byNoticeType[finding.noticeType] = (byNoticeType[finding.noticeType] || 0) + 1;
  }
  const quarantinedClaims = claimDecisions.filter((claim) => claim.status === "quarantine").length;
  const revisionClaims = claimDecisions.filter((claim) => claim.status === "revise").length;
  const score = Math.max(
    0,
    100 - referenceFindings.reduce((total, finding) => {
      const rule = NOTICE_RULES[finding.noticeType] || NOTICE_RULES.active;
      return total + rule.weight;
    }, 0) - quarantinedClaims * 8
  );

  return {
    score,
    referencesChecked: referenceFindings.length,
    claimsChecked: claimDecisions.length,
    blockers: bySeverity.blocker,
    high: bySeverity.high,
    medium: bySeverity.medium,
    noticeTypes: byNoticeType,
    quarantinedClaims,
    revisionClaims
  };
}

function buildReleaseGate(summary, reviewerActions) {
  if (summary.blockers > 0 || summary.quarantinedClaims > 0) {
    return {
      status: "hold",
      reason: "Retracted or primary-notice evidence blocks one or more dependent claims.",
      nextAction: reviewerActions[0] ? reviewerActions[0].action : "Review publication notices."
    };
  }
  if (summary.high > 0 || summary.medium > 0 || summary.revisionClaims > 0) {
    return {
      status: "revise",
      reason: "Publication notices require caveats or citation updates before release.",
      nextAction: reviewerActions[0] ? reviewerActions[0].action : "Revise citation metadata."
    };
  }
  return {
    status: "pass",
    reason: "No blocking publication notices found in cited evidence.",
    nextAction: "Proceed to the next research assistant quality gate."
  };
}

function buildResearchGaps(referenceFindings, claimDecisions) {
  const gaps = [];
  for (const finding of referenceFindings) {
    if (finding.noticeType === "retracted" || finding.noticeType === "withdrawn") {
      gaps.push({
        type: "replacement_evidence",
        priority: "blocker",
        prompt: `Find independent, non-retracted evidence for ${finding.impactedClaimIds.join(", ")}.`,
        sourceReferenceId: finding.referenceId
      });
    }
    if (finding.noticeType === "expression_of_concern") {
      gaps.push({
        type: "independent_replication",
        priority: "high",
        prompt: `Replicate or cross-check claims affected by ${finding.referenceId} before release.`,
        sourceReferenceId: finding.referenceId
      });
    }
    if (finding.noticeType === "major_correction") {
      gaps.push({
        type: "corrected_effect_review",
        priority: "medium",
        prompt: `Re-run claim wording against corrected effect metadata for ${finding.referenceId}.`,
        sourceReferenceId: finding.referenceId
      });
    }
  }

  for (const claim of claimDecisions) {
    if (claim.status === "quarantine") {
      gaps.push({
        type: "claim_release_blocker",
        priority: "blocker",
        prompt: `Hold ${claim.claimId} until publication-notice remediation is complete.`,
        sourceReferenceId: claim.blockedByReferenceIds[0] || null
      });
    }
  }

  return gaps.sort((left, right) => {
    const severityDelta = SEVERITY_ORDER[left.priority] - SEVERITY_ORDER[right.priority];
    if (severityDelta !== 0) return severityDelta;
    return left.prompt.localeCompare(right.prompt);
  });
}

function toMarkdown(report) {
  const lines = [
    `# Retraction Notice Citation Sentinel Report`,
    "",
    `Project: ${report.project.title}`,
    `Decision: ${report.releaseGate.status.toUpperCase()}`,
    `Score: ${report.summary.score}`,
    `Audit digest: ${report.auditDigest}`,
    "",
    "## Summary",
    "",
    `- References checked: ${report.summary.referencesChecked}`,
    `- Claims checked: ${report.summary.claimsChecked}`,
    `- Blocking notices: ${report.summary.blockers}`,
    `- Claims quarantined: ${report.summary.quarantinedClaims}`,
    `- Claims needing revision: ${report.summary.revisionClaims}`,
    "",
    "## Reviewer Actions",
    ""
  ];

  for (const action of report.reviewerActions) {
    lines.push(`- [${action.priority}] ${action.title}: ${action.action}`);
  }

  lines.push("", "## Claim Decisions", "");
  for (const claim of report.claimDecisions) {
    lines.push(`- ${claim.claimId} (${claim.status}): ${claim.assistantInstruction}`);
  }

  lines.push("", "## Reproducibility Context", "");
  lines.push(`- Data policy: ${report.reproducibilityContext.dataPolicy}`);
  lines.push(`- External network calls: ${report.reproducibilityContext.externalNetworkCalls}`);
  lines.push(`- Notice fingerprint: ${report.reproducibilityContext.noticeRegistryFingerprint}`);

  return `${lines.join("\n")}\n`;
}

function toSvg(report) {
  const bars = [
    { label: "Blockers", value: report.summary.blockers, color: "#b91c1c" },
    { label: "Warnings", value: report.summary.high + report.summary.medium, color: "#b45309" },
    { label: "Quarantined", value: report.summary.quarantinedClaims, color: "#7f1d1d" },
    { label: "Revisions", value: report.summary.revisionClaims, color: "#1d4ed8" }
  ];
  const maxValue = Math.max(1, ...bars.map((bar) => bar.value));
  const barMarkup = bars.map((bar, index) => {
    const y = 230 + index * 70;
    const width = Math.round((bar.value / maxValue) * 520);
    return [
      `<text x="80" y="${y}" font-family="Arial, sans-serif" font-size="26" fill="#172554">${escapeXml(bar.label)}</text>`,
      `<rect x="260" y="${y - 28}" width="540" height="36" rx="4" fill="#e5e7eb"/>`,
      `<rect x="260" y="${y - 28}" width="${width}" height="36" rx="4" fill="${bar.color}"/>`,
      `<text x="825" y="${y}" font-family="Arial, sans-serif" font-size="26" fill="#111827">${bar.value}</text>`
    ].join("\n");
  }).join("\n");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="620" viewBox="0 0 1100 620" role="img" aria-label="Retraction notice citation sentinel summary">`,
    `<rect width="1100" height="620" fill="#f8fafc"/>`,
    `<rect x="48" y="44" width="1004" height="532" rx="8" fill="#ffffff" stroke="#cbd5e1"/>`,
    `<text x="80" y="112" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#0f172a">Retraction Notice Citation Sentinel</text>`,
    `<text x="80" y="160" font-family="Arial, sans-serif" font-size="24" fill="#334155">Gate: ${escapeXml(report.releaseGate.status.toUpperCase())} | Score: ${report.summary.score} | Digest: ${escapeXml(report.auditDigest.slice(0, 16))}</text>`,
    barMarkup,
    `<text x="80" y="548" font-family="Arial, sans-serif" font-size="22" fill="#475569">Synthetic-data demo. No external citation databases, credentials, or network calls.</text>`,
    `</svg>`
  ].join("\n");
}

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableStringify(value[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  buildSentinelReport,
  toMarkdown,
  toSvg,
  normalizeNoticeType,
  stableStringify,
  digest
};
