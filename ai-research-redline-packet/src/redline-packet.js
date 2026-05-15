const crypto = require("node:crypto");

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return `sha256:${crypto.createHash("sha256").update(stableStringify(value)).digest("hex")}`;
}

function validateManifest(manifest) {
  const errors = [];
  if (manifest.schemaVersion !== "ai-redline-packet.v1") {
    errors.push("schemaVersion must be ai-redline-packet.v1");
  }
  if (!manifest.manuscript?.id) {
    errors.push("manuscript.id is required");
  }
  if (!Array.isArray(manifest.manuscript?.claims)) {
    errors.push("manuscript.claims must be an array");
  }
  if (!Array.isArray(manifest.manuscript?.evidenceSpans)) {
    errors.push("manuscript.evidenceSpans must be an array");
  }
  for (const claim of manifest.manuscript?.claims || []) {
    if (!claim.id || !claim.text || !claim.sectionId) {
      errors.push("every claim requires id, text, and sectionId");
    }
  }
  for (const span of manifest.manuscript?.evidenceSpans || []) {
    if (!span.id || !span.quote || !span.artifact) {
      errors.push("every evidence span requires id, quote, and artifact");
    }
  }
  return errors;
}

function indexById(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function summarize(manuscript) {
  const keyClaims = manuscript.claims.filter((claim) => claim.importance === "key-finding");
  const reproducibilityClaims = manuscript.claims.filter((claim) => claim.importance === "reproducibility");
  const broadClaims = manuscript.claims.filter((claim) => claim.importance === "broad-claim");

  return {
    abstract: `${manuscript.title}: ${keyClaims.map((claim) => claim.text).join(" ")}`,
    executive: [
      `${keyClaims.length} key finding(s) are ready for evidence review.`,
      `${reproducibilityClaims.length} reproducibility claim(s) mention project repository evidence.`,
      `${broadClaims.length} broad claim(s) need tighter support before submission.`
    ].join(" "),
    layperson: "The study tests whether a controlled oxygen environment changes neural organoid health, but some claims need clearer evidence and reporting before submission."
  };
}

function detectEvidenceRedlines(manuscript) {
  const evidenceIndex = indexById(manuscript.evidenceSpans);
  return manuscript.claims
    .filter((claim) => claim.evidenceSpanIds.length === 0)
    .map((claim) => ({
      id: `evidence-${claim.id}`,
      type: "evidence",
      severity: claim.importance === "broad-claim" ? "blocker" : "major",
      claimId: claim.id,
      sectionId: claim.sectionId,
      message: "Claim has no linked evidence span.",
      insertionTarget: claim.sectionId,
      evidenceDigest: digest({ claim: claim.text, evidence: [] })
    }))
    .concat(
      manuscript.claims
        .filter((claim) => claim.evidenceSpanIds.some((id) => !evidenceIndex.has(id)))
        .map((claim) => ({
          id: `missing-evidence-${claim.id}`,
          type: "evidence",
          severity: "major",
          claimId: claim.id,
          sectionId: claim.sectionId,
          message: "Claim references an evidence span that is not present in the manuscript packet.",
          insertionTarget: claim.sectionId,
          evidenceDigest: digest({ claim: claim.text, evidenceSpanIds: claim.evidenceSpanIds })
        }))
    );
}

function detectStatisticalRedlines(manuscript) {
  const redlines = [];
  for (const check of manuscript.statisticalChecks || []) {
    if (check.claimsSignificant && check.pValue >= 0.05) {
      redlines.push({
        id: `stat-significance-${check.id}`,
        type: "statistics",
        severity: "blocker",
        claimId: check.claimId,
        sectionId: manuscript.claims.find((claim) => claim.id === check.claimId)?.sectionId || "results",
        message: `${check.metric} is described as significant but p=${check.pValue}.`,
        insertionTarget: "results",
        evidenceDigest: digest(check)
      });
    }
    if (!check.confidenceInterval) {
      redlines.push({
        id: `stat-ci-${check.id}`,
        type: "statistics",
        severity: "major",
        claimId: check.claimId,
        sectionId: manuscript.claims.find((claim) => claim.id === check.claimId)?.sectionId || "results",
        message: `${check.metric} is missing a confidence interval.`,
        insertionTarget: "results",
        evidenceDigest: digest(check)
      });
    }
  }
  return redlines;
}

function detectComplianceRedlines(manuscript) {
  const items = [];
  const compliance = manuscript.compliance || {};
  if (compliance.ethicsStatementPresent && !compliance.irbProtocolId) {
    items.push({
      id: "compliance-irb-protocol",
      type: "ethics",
      severity: "major",
      claimId: null,
      sectionId: "ethics",
      message: "Ethics statement is present but lacks an IRB/protocol identifier.",
      insertionTarget: "ethics",
      evidenceDigest: digest({ ethicsStatementPresent: true, irbProtocolId: null })
    });
  }
  if (!compliance.conflictOfInterestPresent) {
    items.push({
      id: "compliance-conflict-disclosure",
      type: "compliance",
      severity: "major",
      claimId: null,
      sectionId: "disclosures",
      message: "Conflict-of-interest disclosure is missing.",
      insertionTarget: "disclosures",
      evidenceDigest: digest({ conflictOfInterestPresent: false })
    });
  }
  return items;
}

function rankCitationRecommendations(manuscript, redlines) {
  const claimRedlineIds = new Set(redlines.map((redline) => redline.claimId).filter(Boolean));
  return manuscript.candidateCitations
    .map((citation) => {
      const matchingRedlineCount = citation.claimIds.filter((claimId) => claimRedlineIds.has(claimId)).length;
      const score = matchingRedlineCount * 2 + (citation.year >= 2024 ? 1 : 0);
      return {
        id: citation.id,
        title: citation.title,
        year: citation.year,
        score,
        reason: citation.reason,
        claimIds: citation.claimIds
      };
    })
    .sort((a, b) => b.score - a.score || b.year - a.year);
}

function routeReviewTemplates(manifest, redlines) {
  const topicSet = new Set(redlines.map((redline) => redline.type));
  if (redlines.some((redline) => redline.type === "statistics")) {
    topicSet.add("sample-size");
    topicSet.add("effect-size");
  }
  if (redlines.some((redline) => redline.type === "compliance")) {
    topicSet.add("data-availability");
  }

  return manifest.reviewTemplates.map((template) => {
    const matchedTopics = template.requiredTopics.filter((topic) => topicSet.has(topic));
    return {
      id: template.id,
      name: template.name,
      matchedTopics,
      recommended: matchedTopics.length > 0
    };
  });
}

function buildRevisionTasks(redlines, citations) {
  return redlines.map((redline, index) => {
    const citation = citations.find((candidate) => candidate.claimIds.includes(redline.claimId));
    return {
      id: `task-${String(index + 1).padStart(2, "0")}`,
      severity: redline.severity,
      insertionTarget: redline.insertionTarget,
      redlineId: redline.id,
      action: citation
        ? `${redline.message} Add or discuss citation: ${citation.title}.`
        : redline.message,
      readyForInsert: true
    };
  });
}

function createRedlinePacket(manifest) {
  const validationErrors = validateManifest(manifest);
  if (validationErrors.length > 0) {
    return {
      valid: false,
      validationErrors,
      decision: "invalid-manifest",
      redlines: [],
      revisionTasks: [],
      citationRecommendations: [],
      summary: {
        redlines: 0,
        revisionTasks: 0,
        citationRecommendations: 0
      }
    };
  }

  const manuscript = manifest.manuscript;
  const redlines = [
    ...detectEvidenceRedlines(manuscript),
    ...detectStatisticalRedlines(manuscript),
    ...detectComplianceRedlines(manuscript)
  ];
  const citationRecommendations = rankCitationRecommendations(manuscript, redlines);
  const revisionTasks = buildRevisionTasks(redlines, citationRecommendations);
  const templateRouting = routeReviewTemplates(manifest, redlines);
  const decision = redlines.some((redline) => redline.severity === "blocker")
    ? "revise-before-submit"
    : redlines.length > 0
      ? "minor-revision"
      : "ready";

  const summary = {
    manuscriptId: manuscript.id,
    decision,
    redlines: redlines.length,
    blockers: redlines.filter((redline) => redline.severity === "blocker").length,
    revisionTasks: revisionTasks.length,
    citationRecommendations: citationRecommendations.length
  };

  return {
    valid: true,
    validationErrors: [],
    decision,
    summaries: summarize(manuscript),
    redlines,
    revisionTasks,
    citationRecommendations,
    templateRouting,
    summary,
    auditDigest: digest({
      summary,
      redlines: redlines.map((redline) => ({
        id: redline.id,
        severity: redline.severity,
        evidenceDigest: redline.evidenceDigest
      }))
    })
  };
}

function formatPacketReport(packet) {
  if (!packet.valid) {
    return [`Manifest invalid:`, ...packet.validationErrors.map((error) => `- ${error}`)].join("\n");
  }

  const lines = [
    `Packet decision: ${packet.decision}`,
    `Redlines: ${packet.summary.redlines}`,
    `Blockers: ${packet.summary.blockers}`,
    `Revision tasks: ${packet.summary.revisionTasks}`,
    `Citation recommendations: ${packet.summary.citationRecommendations}`,
    `Audit digest: ${packet.auditDigest}`,
    "",
    `Executive summary: ${packet.summaries.executive}`,
    ""
  ];

  for (const redline of packet.redlines) {
    lines.push(`${redline.severity.toUpperCase()} ${redline.id}`);
    lines.push(`  ${redline.message}`);
  }

  return lines.join("\n");
}

module.exports = {
  createRedlinePacket,
  digest,
  formatPacketReport,
  stableStringify,
  validateManifest
};
