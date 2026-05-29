const crypto = require("crypto");

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function embargoDays(embargoUntil, now = new Date("2026-05-29T00:00:00Z")) {
  if (!embargoUntil) return 0;
  const embargoDate = new Date(`${embargoUntil}T00:00:00Z`);
  if (Number.isNaN(embargoDate.getTime())) return 0;
  return Math.ceil((embargoDate.getTime() - now.getTime()) / 86_400_000);
}

function evaluateJob(job) {
  const findings = [];

  if (job.mandate.dueInHours < 0) {
    findings.push({
      severity: "blocker",
      code: "mandate-deadline-missed",
      message: `${job.mandate.funder} repository sync is ${Math.abs(job.mandate.dueInHours)} hour(s) overdue.`,
    });
  } else if (job.mandate.dueInHours <= 48) {
    findings.push({
      severity: "review",
      code: "mandate-deadline-near",
      message: `${job.mandate.funder} deadline is within ${job.mandate.dueInHours} hour(s).`,
    });
  }

  if (!job.package.metadataComplete) {
    findings.push({
      severity: "blocker",
      code: "metadata-incomplete",
      message: "Repository export metadata is incomplete.",
    });
  }

  if (job.mandate.requiresDoi && !job.package.doiPresent) {
    findings.push({
      severity: "blocker",
      code: "missing-doi",
      message: "Target repository or funder mandate requires DOI preservation.",
    });
  }

  if (job.mandate.requiresOrcid && job.package.orcidCoveragePercent < 90) {
    findings.push({
      severity: "review",
      code: "low-orcid-coverage",
      message: `ORCID coverage is ${job.package.orcidCoveragePercent}%, below the 90% admin threshold.`,
    });
  }

  if (!job.package.artifactHashPinned) {
    findings.push({
      severity: "blocker",
      code: "unpinned-artifact-hash",
      message: "Export package must pin artifact hashes before repository sync.",
    });
  }

  const holdDays = embargoDays(job.package.embargoUntil);
  if (holdDays > 0) {
    findings.push({
      severity: "blocker",
      code: "active-embargo",
      message: `Repository sync is blocked by an active embargo for ${holdDays} day(s).`,
    });
  }

  if (job.operations.queuedHours >= 24 || job.operations.retryCount >= 3) {
    findings.push({
      severity: "review",
      code: "sync-backlog-risk",
      message: `Sync has queued for ${job.operations.queuedHours} hour(s) with ${job.operations.retryCount} retry attempt(s).`,
    });
  }

  if (job.operations.lastWebhookStatus === "failed") {
    findings.push({
      severity: "review",
      code: "webhook-delivery-failed",
      message: "Last institutional webhook delivery failed and requires admin visibility.",
    });
  }

  const blockers = findings.filter((finding) => finding.severity === "blocker");
  const reviews = findings.filter((finding) => finding.severity === "review");
  const decision = blockers.length ? "blocked" : reviews.length ? "needs_review" : "ready";

  return {
    id: job.id,
    project: job.project,
    targetRepository: job.target.repository,
    targetType: job.target.type,
    adminOwner: job.operations.adminOwner,
    decision,
    findings,
    escalation: decision === "ready" ? "release-to-sync-worker" : `route-to-${job.operations.adminOwner}`,
    auditDigest: digest({
      id: job.id,
      decision,
      findings: findings.map((finding) => finding.code),
      target: job.target,
      mandate: job.mandate,
    }),
  };
}

function evaluateSyncJobs(jobs) {
  const decisions = jobs.map(evaluateJob);
  const summary = decisions.reduce(
    (acc, decision) => {
      acc.total += 1;
      acc[decision.decision] += 1;
      acc.findingCount += decision.findings.length;
      return acc;
    },
    { total: 0, ready: 0, needs_review: 0, blocked: 0, findingCount: 0 }
  );
  return {
    generatedAt: "2026-05-29T00:00:00.000Z",
    guard: "institutional-repository-sync-sla-guard",
    summary,
    decisions,
    reportDigest: digest({ summary, decisions }),
  };
}

module.exports = { evaluateJob, evaluateSyncJobs, embargoDays };
