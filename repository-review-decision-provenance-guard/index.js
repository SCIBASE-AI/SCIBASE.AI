"use strict";

const crypto = require("node:crypto");

const SEVERITY_ORDER = ["critical", "high", "warning", "info"];

const DEFAULT_POLICY = {
  requiredDecisionComponents: ["manuscript", "data", "code", "notebook", "metadata"],
  requiredReviewerRolesByComponent: {
    manuscript: ["scientific-editor", "methods-reviewer"],
    data: ["data-steward", "methods-reviewer"],
    code: ["reproducibility-reviewer", "maintainer"],
    notebook: ["reproducibility-reviewer", "methods-reviewer"],
    metadata: ["metadata-curator", "scientific-editor"],
    protocol: ["protocol-reviewer", "methods-reviewer"],
    results: ["methods-reviewer", "scientific-editor"]
  },
  maxResolutionAgeHoursAfterAnchor: 72,
  requireExportManifestDecisionPacket: true
};

function evaluateReviewDecisionProvenance(packet, options = {}) {
  if (!isPlainObject(packet)) {
    throw new TypeError("evaluateReviewDecisionProvenance expects a packet object");
  }

  const now = options.now ?? new Date().toISOString();
  const policy = mergePolicy(packet.policy);
  const releaseCandidate = isPlainObject(packet.releaseCandidate) ? packet.releaseCandidate : {};
  const mergeRequests = asArray(packet.mergeRequests);
  const components = asArray(packet.repositoryComponents);
  const findings = [];

  inspectReleaseCandidate(releaseCandidate, policy, findings);
  inspectComponentCoverage(components, mergeRequests, policy, findings);

  const decisionRecords = [];
  mergeRequests.forEach((mergeRequest, mergeRequestIndex) => {
    inspectMergeRequest(mergeRequest, mergeRequestIndex, policy, findings, decisionRecords);
  });

  const sortedFindings = sortFindings(findings);
  const status = determineStatus(sortedFindings);
  const coverage = buildCoverageSummary(policy, decisionRecords, components);
  const releaseReadiness = buildReleaseReadiness(status, sortedFindings, decisionRecords, releaseCandidate);
  const manifestPatch = buildManifestPatch(packet, releaseCandidate, decisionRecords, sortedFindings);
  const remediationActions = sortedFindings.map((finding) => ({
    code: finding.code,
    owner: finding.owner,
    action: finding.remediation,
    path: finding.path
  }));
  const fingerprint = buildFingerprint({ policy, releaseCandidate, mergeRequests, sortedFindings, decisionRecords });

  return {
    generatedAt: now,
    status,
    summary: summarize(status, sortedFindings, decisionRecords, coverage),
    findingCounts: countBySeverity(sortedFindings),
    findings: sortedFindings,
    coverage,
    decisionRecords,
    releaseReadiness,
    manifestPatch,
    remediationActions,
    fingerprint
  };
}

function renderMarkdownReport(result, packet) {
  const release = packet.releaseCandidate ?? {};
  const lines = [
    "# Repository Review-Decision Provenance Guard",
    "",
    `Packet: ${packet.id ?? "unknown"}`,
    `Release candidate: ${release.tag ?? "untagged"}`,
    `Status: ${result.status}`,
    `Fingerprint: ${result.fingerprint}`,
    "",
    "## Summary",
    "",
    result.summary,
    "",
    "## Coverage",
    "",
    `- Components requiring decision evidence: ${result.coverage.requiredComponents.join(", ")}`,
    `- Covered components: ${result.coverage.coveredComponents.join(", ") || "none"}`,
    `- Missing components: ${result.coverage.missingComponents.join(", ") || "none"}`,
    "",
    "## Decision Records",
    ""
  ];

  if (result.decisionRecords.length === 0) {
    lines.push("- No resolved review-decision records are ready for export.");
  } else {
    result.decisionRecords.forEach((record) => {
      lines.push(`- ${record.id}: ${record.component} ${record.decision} by ${record.reviewerRole}`);
      lines.push(`  - Anchor: ${record.anchorPath} @ ${record.anchorCommit}`);
      lines.push(`  - Export state: ${record.exportState}`);
    });
  }

  lines.push("", "## Findings", "");
  if (result.findings.length === 0) {
    lines.push("- No release-blocking decision-provenance findings.");
  } else {
    result.findings.forEach((finding) => {
      lines.push(`- ${finding.severity.toUpperCase()} ${finding.code}: ${finding.message}`);
      lines.push(`  - Evidence: ${finding.evidence}`);
      lines.push(`  - Remediation: ${finding.remediation}`);
    });
  }

  lines.push("", "## Manifest Patch", "");
  lines.push("```json");
  lines.push(JSON.stringify(result.manifestPatch, null, 2));
  lines.push("```");

  return `${lines.join("\n")}\n`;
}

function renderSvgSummary(result) {
  const counts = result.findingCounts;
  const blockers = (counts.critical ?? 0) + (counts.high ?? 0);
  const warning = counts.warning ?? 0;
  const covered = result.coverage.coveredComponents.length;
  const missing = result.coverage.missingComponents.length;
  const statusColor = result.status === "READY" ? "#16794c" : result.status === "REVIEW" ? "#a15c00" : "#a11b32";
  const coveredWidth = Math.min(390, covered * 64);
  const missingWidth = Math.min(260, missing * 64);
  const warningWidth = Math.min(190, warning * 38);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Repository review decision provenance summary">`,
    `<rect width="960" height="540" fill="#18212f"/>`,
    `<rect x="48" y="48" width="864" height="444" rx="12" fill="#f8fafc"/>`,
    `<text x="82" y="118" font-family="Arial, sans-serif" font-size="33" font-weight="700" fill="#111827">Review-decision provenance</text>`,
    `<text x="82" y="162" font-family="Arial, sans-serif" font-size="19" fill="#475569">Status ${escapeXml(result.status)} - fingerprint ${escapeXml(result.fingerprint)}</text>`,
    `<rect x="82" y="214" width="${Math.max(80, coveredWidth)}" height="58" fill="#16794c"/>`,
    `<rect x="${82 + Math.max(80, coveredWidth)}" y="214" width="${missingWidth}" height="58" fill="${statusColor}"/>`,
    `<rect x="${82 + Math.max(80, coveredWidth) + missingWidth}" y="214" width="${warningWidth}" height="58" fill="#a15c00"/>`,
    `<text x="96" y="251" font-family="Arial, sans-serif" font-size="21" font-weight="700" fill="#ffffff">DECISION PACKET</text>`,
    `<text x="82" y="336" font-family="Arial, sans-serif" font-size="22" fill="#334155">Critical/high blockers: ${blockers}</text>`,
    `<text x="82" y="376" font-family="Arial, sans-serif" font-size="22" fill="#334155">Decision records: ${result.decisionRecords.length}</text>`,
    `<text x="82" y="416" font-family="Arial, sans-serif" font-size="22" fill="#334155">Coverage: ${covered}/${result.coverage.requiredComponents.length} components</text>`,
    `</svg>`
  ].join("\n");
}

function inspectReleaseCandidate(releaseCandidate, policy, findings) {
  if (!releaseCandidate.tag) {
    findings.push(
      finding(
        "RELEASE_TAG_MISSING",
        "high",
        "The repository release candidate has no stable tag.",
        "Decision provenance must bind to a tag or export version.",
        "releaseCandidate.tag",
        "Attach the semantic tag or export version before publishing the review-decision packet.",
        "repository maintainer"
      )
    );
  }

  if (!releaseCandidate.exportManifest || !isPlainObject(releaseCandidate.exportManifest)) {
    findings.push(
      finding(
        "EXPORT_MANIFEST_MISSING",
        "high",
        "The release candidate has no export manifest.",
        "Review decisions need to be discoverable from the repository export bundle.",
        "releaseCandidate.exportManifest",
        "Add an export manifest with DOI, bundle hash, component hashes, and review decision packet references.",
        "release engineer"
      )
    );
    return;
  }

  const manifest = releaseCandidate.exportManifest;
  if (!manifest.doi && !manifest.persistentId) {
    findings.push(
      finding(
        "PERSISTENT_ID_MISSING",
        "warning",
        "The export manifest has no DOI or persistent identifier.",
        "Citation and redirect tooling cannot trace reviewer decisions to a durable release.",
        "releaseCandidate.exportManifest.doi",
        "Add DOI/DataCite or a stable persistent id before public export.",
        "metadata curator"
      )
    );
  }

  if (!manifest.bundleHash) {
    findings.push(
      finding(
        "EXPORT_BUNDLE_HASH_MISSING",
        "high",
        "The export manifest does not declare a bundle hash.",
        "Decision records cannot prove which export they reviewed.",
        "releaseCandidate.exportManifest.bundleHash",
        "Record the export bundle SHA-256 or equivalent content digest.",
        "release engineer"
      )
    );
  }

  if (policy.requireExportManifestDecisionPacket && !manifest.reviewDecisionPacket) {
    findings.push(
      finding(
        "REVIEW_DECISION_PACKET_NOT_LINKED",
        "high",
        "The export manifest does not link the review-decision provenance packet.",
        "Resolved scientific review decisions must be carried with the release/export evidence.",
        "releaseCandidate.exportManifest.reviewDecisionPacket",
        "Add a reviewDecisionPacket entry with packet hash, record count, and covered components.",
        "release engineer"
      )
    );
  }
}

function inspectComponentCoverage(components, mergeRequests, policy, findings) {
  const touchedComponents = new Set();
  mergeRequests.forEach((mergeRequest) => {
    asArray(mergeRequest.changedComponents).forEach((component) => touchedComponents.add(component));
    asArray(mergeRequest.reviewThreads).forEach((thread) => {
      if (thread.component) {
        touchedComponents.add(thread.component);
      }
    });
  });

  const declaredComponents = new Set(components.map((component) => component.type).filter(Boolean));
  policy.requiredDecisionComponents.forEach((component) => {
    if (!declaredComponents.has(component) && !touchedComponents.has(component)) {
      findings.push(
        finding(
          "REQUIRED_COMPONENT_NOT_DECLARED",
          "warning",
          `No repository component declaration or review touchpoint was found for ${component}.`,
          "Release provenance is strongest when all core scientific repository components are represented.",
          "repositoryComponents",
          `Declare ${component} in repositoryComponents or document why it is out of scope for this release.`,
          "repository maintainer"
        )
      );
    }
  });
}

function inspectMergeRequest(mergeRequest, mergeRequestIndex, policy, findings, decisionRecords) {
  const basePath = `mergeRequests[${mergeRequestIndex}]`;
  const mergeRequestId = mergeRequest.id ?? `mr-${mergeRequestIndex}`;
  const threads = asArray(mergeRequest.reviewThreads);

  if (!mergeRequest.id) {
    findings.push(
      finding(
        "MERGE_REQUEST_ID_MISSING",
        "warning",
        `Merge request at index ${mergeRequestIndex} has no stable id.`,
        "Decision records should remain traceable to a merge request id.",
        `${basePath}.id`,
        "Assign a stable merge request id before generating release provenance.",
        "repository maintainer",
        mergeRequestId
      )
    );
  }

  if (threads.length === 0) {
    findings.push(
      finding(
        "NO_REVIEW_THREADS",
        "high",
        `${mergeRequestId} has no review discussion threads.`,
        "The guard preserves resolved scientific decisions; a release-changing merge needs review decisions.",
        `${basePath}.reviewThreads`,
        "Attach resolved scientific review threads or mark the merge request as documentation-only with justification.",
        "scientific editor",
        mergeRequestId
      )
    );
  }

  threads.forEach((thread, threadIndex) =>
    inspectThread(thread, threadIndex, mergeRequest, basePath, policy, findings, decisionRecords)
  );
}

function inspectThread(thread, threadIndex, mergeRequest, basePath, policy, findings, decisionRecords) {
  const threadPath = `${basePath}.reviewThreads[${threadIndex}]`;
  const threadId = thread.id ?? `${mergeRequest.id ?? "mr"}-thread-${threadIndex}`;
  const component = thread.component ?? inferComponentFromPath(thread.anchor?.path ?? thread.filePath ?? "");
  const allowedRoles = policy.requiredReviewerRolesByComponent[component] ?? [];
  const status = String(thread.status ?? "").toLowerCase();

  if (!thread.id) {
    findings.push(
      finding(
        "THREAD_ID_MISSING",
        "warning",
        `Review thread at index ${threadIndex} has no stable id.`,
        "Decision records need stable thread ids for later audit and citation package lookup.",
        `${threadPath}.id`,
        "Add a stable review thread id.",
        "repository maintainer",
        mergeRequest.id,
        threadId
      )
    );
  }

  if (status !== "resolved") {
    findings.push(
      finding(
        "THREAD_NOT_RESOLVED_FOR_EXPORT",
        "high",
        `${threadId} is not resolved but is present in the release decision packet.`,
        "This guard archives resolved decision provenance; open discussions should be routed back to merge review.",
        `${threadPath}.status`,
        "Resolve the discussion with a rationale or remove it from the release decision packet until review is complete.",
        "scientific editor",
        mergeRequest.id,
        threadId
      )
    );
  }

  if (!component) {
    findings.push(
      finding(
        "THREAD_COMPONENT_MISSING",
        "high",
        `${threadId} is not mapped to a repository component.`,
        "Scientific review decisions must state whether they apply to manuscript, data, code, notebook, protocol, results, or metadata.",
        `${threadPath}.component`,
        "Map the thread to a repository component before export.",
        "scientific editor",
        mergeRequest.id,
        threadId
      )
    );
  }

  if (component && allowedRoles.length > 0 && !allowedRoles.includes(thread.reviewerRole)) {
    findings.push(
      finding(
        "REVIEWER_ROLE_NOT_ELIGIBLE_FOR_COMPONENT",
        "high",
        `${threadId} uses reviewer role ${thread.reviewerRole ?? "unknown"} for ${component}.`,
        `Allowed reviewer roles for ${component}: ${allowedRoles.join(", ")}.`,
        `${threadPath}.reviewerRole`,
        "Add an eligible reviewer decision or document an escalation override in the decision record.",
        "scientific editor",
        mergeRequest.id,
        threadId
      )
    );
  }

  const anchor = isPlainObject(thread.anchor) ? thread.anchor : {};
  if (!anchor.path || !anchor.commit) {
    findings.push(
      finding(
        "THREAD_ANCHOR_INCOMPLETE",
        "high",
        `${threadId} is missing file path or commit anchoring.`,
        "Decision records cannot prove which repository content was reviewed without path and commit anchors.",
        `${threadPath}.anchor`,
        "Attach anchor.path and anchor.commit for the reviewed file or notebook output.",
        "repository maintainer",
        mergeRequest.id,
        threadId
      )
    );
  }

  if (status === "resolved" && (!thread.resolutionRationale || String(thread.resolutionRationale).trim().length < 16)) {
    findings.push(
      finding(
        "RESOLUTION_RATIONALE_TOO_THIN",
        "high",
        `${threadId} has no durable resolution rationale.`,
        "A resolved scientific review thread needs enough rationale for future auditors and citation readers.",
        `${threadPath}.resolutionRationale`,
        "Record the accepted change, scientific reasoning, or deferral basis in the resolution rationale.",
        "reviewer"
      )
    );
  }

  if (thread.containsPrivateNote && !thread.redactedForExport) {
    findings.push(
      finding(
        "PRIVATE_REVIEW_NOTE_EXPORTED",
        "critical",
        `${threadId} contains a private reviewer note without export redaction.`,
        "Repository exports must not leak private reviewer notes, blind-review details, or hidden institutional comments.",
        `${threadPath}.redactedForExport`,
        "Redact private notes and preserve only a public-safe reason code in the exported decision record.",
        "scientific editor",
        mergeRequest.id,
        threadId
      )
    );
  }

  if (status === "resolved" && thread.exported !== true) {
    findings.push(
      finding(
        "RESOLVED_DECISION_NOT_EXPORTED",
        "high",
        `${threadId} is resolved but not marked for export.`,
        "Resolved scientific review decisions should be carried into release/export evidence instead of disappearing after merge.",
        `${threadPath}.exported`,
        "Set exported=true and include the record in the reviewDecisionPacket manifest entry.",
        "release engineer",
        mergeRequest.id,
        threadId
      )
    );
  }

  if (asArray(thread.evidenceRefs).length === 0) {
    findings.push(
      finding(
        "DECISION_EVIDENCE_REFS_MISSING",
        "warning",
        `${threadId} has no linked evidence references.`,
        "Decision records should link tests, rendered outputs, reviewer screenshots, or manifest entries.",
        `${threadPath}.evidenceRefs`,
        "Attach evidenceRefs for tests, outputs, exported artifacts, or reviewer attachments.",
        "reviewer",
        mergeRequest.id,
        threadId
      )
    );
  }

  decisionRecords.push({
    id: threadId,
    mergeRequestId: mergeRequest.id ?? null,
    component: component ?? "unknown",
    category: thread.category ?? "review-decision",
    decision: thread.decision ?? "unspecified",
    reviewerRole: thread.reviewerRole ?? "unknown",
    reviewerId: thread.reviewerId ?? "unknown",
    anchorPath: anchor.path ?? null,
    anchorCommit: anchor.commit ?? null,
    resolutionRationale: thread.resolutionRationale ?? "",
    exportState: thread.exported === true ? "included" : "missing",
    redactionState: thread.containsPrivateNote ? (thread.redactedForExport ? "redacted" : "leaking") : "public-safe",
    evidenceRefs: asArray(thread.evidenceRefs)
  });
}

function buildCoverageSummary(policy, decisionRecords, components) {
  const covered = new Set(
    decisionRecords
      .filter((record) => record.exportState === "included" && record.redactionState !== "leaking")
      .map((record) => record.component)
  );
  const declared = new Set(components.map((component) => component.type).filter(Boolean));
  const requiredComponents = policy.requiredDecisionComponents.filter((component) => declared.has(component) || covered.has(component));
  const required = requiredComponents.length > 0 ? requiredComponents : policy.requiredDecisionComponents;

  return {
    requiredComponents: required,
    coveredComponents: required.filter((component) => covered.has(component)),
    missingComponents: required.filter((component) => !covered.has(component)),
    exportedRecordCount: decisionRecords.filter((record) => record.exportState === "included").length
  };
}

function buildReleaseReadiness(status, findings, decisionRecords, releaseCandidate) {
  const blockers = findings.filter((item) => item.severity === "critical" || item.severity === "high");
  return {
    decision: status === "READY" ? "release" : status === "REVIEW" ? "review" : "hold",
    releaseCandidate: releaseCandidate.tag ?? null,
    blockerCodes: blockers.map((item) => item.code),
    exportedDecisionRecords: decisionRecords.filter((record) => record.exportState === "included").length,
    privateLeakRecords: decisionRecords.filter((record) => record.redactionState === "leaking").map((record) => record.id)
  };
}

function buildManifestPatch(packet, releaseCandidate, decisionRecords, findings) {
  const exportedRecords = decisionRecords.filter((record) => record.exportState === "included" && record.redactionState !== "leaking");
  const packetHash = crypto
    .createHash("sha256")
    .update(JSON.stringify({ packetId: packet.id, exportedRecords }))
    .digest("hex");

  return {
    reviewDecisionPacket: {
      packetId: packet.id ?? "review-decision-provenance-packet",
      packetHash,
      releaseTag: releaseCandidate.tag ?? null,
      decisionRecordCount: exportedRecords.length,
      coveredComponents: [...new Set(exportedRecords.map((record) => record.component))].sort(),
      findingCount: findings.length
    }
  };
}

function summarize(status, findings, decisionRecords, coverage) {
  if (status === "READY") {
    return `Release/export is ready with ${decisionRecords.length} review decision record(s) and coverage for ${coverage.coveredComponents.length} component(s).`;
  }

  const blockers = findings.filter((finding) => finding.severity === "critical" || finding.severity === "high").length;
  if (status === "HOLD") {
    return `Hold release/export: ${blockers} critical or high decision-provenance blocker(s) need remediation before reviewer decisions are durable and public-safe.`;
  }

  return `Reviewer follow-up needed: ${findings.length} finding(s) remain, mostly warning-level evidence gaps.`;
}

function finding(code, severity, message, evidence, path, remediation, owner, mergeRequestId = null, threadId = null) {
  return {
    code,
    severity,
    message,
    evidence,
    path,
    remediation,
    owner,
    mergeRequestId,
    threadId
  };
}

function mergePolicy(policy) {
  const incoming = isPlainObject(policy) ? policy : {};
  return {
    ...DEFAULT_POLICY,
    ...incoming,
    requiredReviewerRolesByComponent: {
      ...DEFAULT_POLICY.requiredReviewerRolesByComponent,
      ...(isPlainObject(incoming.requiredReviewerRolesByComponent) ? incoming.requiredReviewerRolesByComponent : {})
    }
  };
}

function sortFindings(findings) {
  return [...findings].sort((a, b) => {
    const severityDelta = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
    if (severityDelta !== 0) {
      return severityDelta;
    }
    return a.code.localeCompare(b.code);
  });
}

function determineStatus(findings) {
  if (findings.some((finding) => finding.severity === "critical" || finding.severity === "high")) {
    return "HOLD";
  }
  if (findings.some((finding) => finding.severity === "warning")) {
    return "REVIEW";
  }
  return "READY";
}

function countBySeverity(findings) {
  return findings.reduce((counts, finding) => {
    counts[finding.severity] = (counts[finding.severity] ?? 0) + 1;
    return counts;
  }, {});
}

function buildFingerprint(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}

function inferComponentFromPath(filePath) {
  if (!filePath) {
    return null;
  }
  const first = String(filePath).split("/")[0];
  const map = {
    manuscript: "manuscript",
    manuscripts: "manuscript",
    data: "data",
    code: "code",
    notebooks: "notebook",
    notebook: "notebook",
    metadata: "metadata",
    protocols: "protocol",
    protocol: "protocol",
    results: "results"
  };
  return map[first] ?? null;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

module.exports = {
  DEFAULT_POLICY,
  evaluateReviewDecisionProvenance,
  renderMarkdownReport,
  renderSvgSummary
};
