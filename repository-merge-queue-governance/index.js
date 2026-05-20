"use strict";

const crypto = require("crypto");

const DEFAULT_POLICY = Object.freeze({
  asOf: "2026-05-20",
  requiredReviewerRoles: ["admin", "reviewer"],
  protectedComponents: ["manuscript", "data", "code", "notebooks", "metadata"],
  maxUnresolvedThreads: 0,
  maxStaleBaseDays: 14,
  requireForkAttribution: true,
  requireReproducibilityEvidence: true,
  requireLfsForLargeFiles: true,
  largeFileThresholdBytes: 10 * 1024 * 1024,
});

function evaluateMergeQueue(input, policyOverrides = {}) {
  const policy = { ...DEFAULT_POLICY, ...policyOverrides };
  const evaluations = [];

  for (const request of input.mergeRequests || []) {
    const findings = [];
    const changedComponents = normalizeSet(request.changedComponents || []);
    const approvals = Array.isArray(request.approvals) ? request.approvals : [];
    const files = Array.isArray(request.files) ? request.files : [];

    if (!request.id) {
      findings.push(blocker("missing_merge_request_id", "Merge request requires a stable id"));
    }

    if (!request.sourceBranch || !request.targetBranch) {
      findings.push(blocker("missing_branch_reference", "Merge request requires sourceBranch and targetBranch"));
    }

    if (!request.authorId) {
      findings.push(blocker("missing_author", "Merge request requires an author id for attribution"));
    }

    const baseAgeDays = request.baseUpdatedAt ? daysBetween(request.baseUpdatedAt, policy.asOf) : Number.POSITIVE_INFINITY;
    if (!request.baseUpdatedAt) {
      findings.push(hold("missing_base_timestamp", "Merge request needs a base branch update timestamp"));
    } else if (baseAgeDays > policy.maxStaleBaseDays) {
      findings.push(hold("stale_base_branch", `Base branch is ${baseAgeDays} days old; max is ${policy.maxStaleBaseDays}`));
    }

    const protectedTouched = policy.protectedComponents.filter((component) => changedComponents.has(component));
    if (protectedTouched.length === 0) {
      findings.push(hold("missing_scientific_component_change", "No protected scientific component is represented in this merge"));
    }

    const approvalResult = evaluateApprovals(approvals, request.authorId, policy);
    findings.push(...approvalResult.findings);

    const unresolvedThreads = request.unresolvedThreads === undefined ? 0 : request.unresolvedThreads;
    if (!Number.isInteger(unresolvedThreads) || unresolvedThreads < 0) {
      findings.push(blocker("invalid_unresolved_threads", "unresolvedThreads must be a non-negative integer"));
    } else if (unresolvedThreads > policy.maxUnresolvedThreads) {
      findings.push(hold("unresolved_review_threads", `${unresolvedThreads} unresolved review thread(s) remain`));
    }

    if (policy.requireForkAttribution && request.forkOf && !request.forkAttributionId) {
      findings.push(hold("missing_fork_attribution", "Forked work needs upstream attribution before merge"));
    }

    if (policy.requireReproducibilityEvidence) {
      const evidence = request.reproducibilityEvidence || {};
      if (!evidence.pipelineId || evidence.status !== "passed" || !evidence.artifactDigest) {
        findings.push(hold("missing_reproducibility_evidence", "Merge needs passed reproducibility evidence with artifact digest"));
      }
    }

    const fileResult = evaluateFiles(files, policy);
    findings.push(...fileResult.findings);

    const semanticVersionImpact = classifyVersionImpact(changedComponents, files, request.breakingChangeNotes);
    if (semanticVersionImpact === "major" && !request.breakingChangeNotes) {
      findings.push(hold("missing_breaking_change_notes", "Major version impact needs breaking-change notes"));
    }

    if (changedComponents.has("metadata") && !request.citationImpactNote) {
      findings.push(hold("missing_citation_impact_note", "Metadata changes need DOI/citation impact notes"));
    }

    const status = evaluationStatus(findings);
    const evaluation = {
      mergeRequestId: request.id || null,
      sourceBranch: request.sourceBranch || null,
      targetBranch: request.targetBranch || null,
      authorId: request.authorId || null,
      status,
      changedComponents: Array.from(changedComponents),
      protectedComponentsTouched: protectedTouched,
      baseAgeDays: Number.isFinite(baseAgeDays) ? baseAgeDays : null,
      requiredReviewerRoles: policy.requiredReviewerRoles,
      approvalsSatisfied: approvalResult.satisfiedRoles,
      unresolvedThreads,
      semanticVersionImpact,
      fileSummary: fileResult.summary,
      findings: dedupeFindings(findings),
      recommendedActions: recommendedActions(status, findings),
    };

    evaluation.auditDigest = digest(evaluation);
    evaluations.push(evaluation);
  }

  const report = {
    asOf: policy.asOf,
    policy,
    mergeRequestCount: evaluations.length,
    totals: summarize(evaluations),
    evaluations,
  };

  return {
    ...report,
    auditDigest: digest(report),
  };
}

function evaluateApprovals(approvals, authorId, policy) {
  const findings = [];
  const rolesByApprover = new Map();

  for (const approval of approvals) {
    if (!approval.userId || !approval.role) continue;
    if (approval.userId === authorId) {
      findings.push(hold("self_approval", `${approval.userId} cannot approve their own merge request`));
      continue;
    }
    rolesByApprover.set(approval.userId, approval.role);
  }

  const satisfiedRoles = policy.requiredReviewerRoles.filter((role) =>
    Array.from(rolesByApprover.values()).includes(role)
  );
  const missingRoles = policy.requiredReviewerRoles.filter((role) => !satisfiedRoles.includes(role));

  for (const role of missingRoles) {
    findings.push(hold("missing_required_approval", `Missing approval from role: ${role}`));
  }

  return { findings, satisfiedRoles };
}

function evaluateFiles(files, policy) {
  const findings = [];
  const summary = {
    fileCount: files.length,
    largeFileCount: 0,
    missingLfsCount: 0,
    generatedOutputCount: 0,
    missingHashCount: 0,
  };

  for (const file of files) {
    const path = file.path || "(unknown)";
    const sizeBytes = file.sizeBytes === undefined ? 0 : file.sizeBytes;

    if (!file.path) {
      findings.push(blocker("missing_file_path", "Every changed file needs a path"));
    }

    if (!Number.isInteger(sizeBytes) || sizeBytes < 0) {
      findings.push(blocker("invalid_file_size", `${path} sizeBytes must be a non-negative integer`));
      continue;
    }

    if (!file.contentHash && !file.deleted) {
      summary.missingHashCount += 1;
      findings.push(hold("missing_content_hash", `${path} needs a content hash for reproducibility tracking`));
    }

    if (sizeBytes >= policy.largeFileThresholdBytes) {
      summary.largeFileCount += 1;
      if (policy.requireLfsForLargeFiles && !file.lfsPointer) {
        summary.missingLfsCount += 1;
        findings.push(hold("large_file_without_lfs", `${path} exceeds large-file threshold without LFS pointer`));
      }
    }

    if (file.generated && !file.generatorDigest) {
      summary.generatedOutputCount += 1;
      findings.push(hold("missing_generator_digest", `${path} is generated but lacks generator digest`));
    } else if (file.generated) {
      summary.generatedOutputCount += 1;
    }
  }

  return { findings, summary };
}

function classifyVersionImpact(changedComponents, files, breakingChangeNotes) {
  if (breakingChangeNotes) return "major";
  if (changedComponents.has("protocols") || changedComponents.has("metadata")) return "minor";
  if (files.some((file) => file.generated || file.path?.startsWith("results/"))) return "patch";
  return "patch";
}

function summarize(evaluations) {
  return evaluations.reduce(
    (totals, evaluation) => {
      if (evaluation.status === "ready") totals.readyCount += 1;
      if (evaluation.status === "held") totals.heldCount += 1;
      if (evaluation.status === "blocked") totals.blockedCount += 1;
      totals.files += evaluation.fileSummary.fileCount;
      totals.largeFiles += evaluation.fileSummary.largeFileCount;
      return totals;
    },
    { readyCount: 0, heldCount: 0, blockedCount: 0, files: 0, largeFiles: 0 }
  );
}

function recommendedActions(status, findings) {
  if (status === "ready") {
    return ["Enter merge queue", "Archive audit digest with the tagged repository version"];
  }

  const actions = new Set();
  for (const finding of findings) {
    if (finding.code === "missing_merge_request_id") actions.add("Attach a stable merge request id");
    if (finding.code === "missing_branch_reference") actions.add("Attach source and target branch references");
    if (finding.code === "missing_author") actions.add("Attach author attribution before review");
    if (finding.code === "stale_base_branch") actions.add("Rebase or refresh against the target branch");
    if (finding.code === "missing_required_approval") actions.add("Collect required reviewer-role approval");
    if (finding.code === "self_approval") actions.add("Replace self-approval with an independent reviewer");
    if (finding.code === "unresolved_review_threads") actions.add("Resolve remaining review discussions");
    if (finding.code === "missing_fork_attribution") actions.add("Attach upstream fork attribution");
    if (finding.code === "missing_reproducibility_evidence") actions.add("Run and attach reproducibility pipeline evidence");
    if (finding.code === "large_file_without_lfs") actions.add("Move large artifacts to Git LFS or external data storage");
    if (finding.code === "missing_content_hash") actions.add("Attach content hashes for all changed artifacts");
    if (finding.code === "missing_generator_digest") actions.add("Attach generator digest for generated outputs");
    if (finding.code === "missing_citation_impact_note") actions.add("Add DOI/citation impact note for metadata changes");
    if (finding.code === "missing_breaking_change_notes") actions.add("Document major version impact before merge");
  }
  return Array.from(actions);
}

function evaluationStatus(findings) {
  if (findings.some((finding) => finding.severity === "blocker")) return "blocked";
  if (findings.some((finding) => finding.severity === "hold")) return "held";
  return "ready";
}

function normalizeSet(values) {
  return new Set(values.filter((value) => typeof value === "string" && value.length > 0));
}

function daysBetween(fromDate, toDate) {
  const from = new Date(`${fromDate}T00:00:00Z`);
  const to = new Date(`${toDate}T00:00:00Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error(`Invalid date range: ${fromDate} to ${toDate}`);
  }
  return Math.max(0, Math.floor((to - from) / 86400000));
}

function blocker(code, message) {
  return { severity: "blocker", code, message };
}

function hold(code, message) {
  return { severity: "hold", code, message };
}

function dedupeFindings(findings) {
  const seen = new Set();
  return findings.filter((finding) => {
    const key = `${finding.severity}:${finding.code}:${finding.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

module.exports = {
  DEFAULT_POLICY,
  evaluateMergeQueue,
};
