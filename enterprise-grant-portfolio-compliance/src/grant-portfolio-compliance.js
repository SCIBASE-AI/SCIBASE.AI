"use strict";

const crypto = require("node:crypto");

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_SECRET = "scibase-enterprise-grant-portfolio-demo-secret";
const SATISFIED_REPORT_STATUSES = new Set(["submitted", "accepted", "complete", "completed"]);
const SATISFIED_DMP_STATUSES = new Set(["approved", "exempt"]);
const SATISFIED_DEPOSIT_STATUSES = new Set(["deposited", "scheduled"]);
const SATISFIED_OPEN_ACCESS_STATUSES = new Set(["open", "scheduled"]);
const PENALTY_BY_SEVERITY = {
  blocker: 28,
  warning: 12,
  todo: 5
};

function normalizeDate(value, fieldName = "date") {
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function daysUntil(asOf, dueDate) {
  return Math.ceil((normalizeDate(dueDate).getTime() - asOf.getTime()) / MS_PER_DAY);
}

function addObligation(obligations, obligation) {
  obligations.push({
    severity: obligation.severity,
    state: obligation.state || stateFromSeverity(obligation.severity),
    scope: obligation.scope,
    grantId: obligation.grantId,
    projectId: obligation.projectId || null,
    outputId: obligation.outputId || null,
    dueDate: obligation.dueDate || null,
    daysUntilDue: obligation.dueDate ? daysUntil(obligation.asOf, obligation.dueDate) : null,
    title: obligation.title,
    evidence: obligation.evidence || [],
    remediation: obligation.remediation
  });
}

function stateFromSeverity(severity) {
  if (severity === "blocker") {
    return "blocked";
  }

  if (severity === "warning") {
    return "needs_attention";
  }

  return "open";
}

function evaluatePortfolio(portfolio, options = {}) {
  if (!portfolio || typeof portfolio !== "object") {
    throw new Error("A grant portfolio object is required.");
  }

  const asOf = normalizeDate(portfolio.asOf || new Date().toISOString().slice(0, 10), "asOf");
  const grants = (portfolio.grants || []).map((grant) => evaluateGrant(grant, asOf));
  const summary = summarizeGrants(grants);
  const adminMetrics = buildAdminMetrics(grants);
  const exportManifest = buildExportManifest(portfolio, grants);
  const events = grants.map((grant) =>
    signEvent(
      {
        type: "grant.compliance.evaluated",
        asOf: formatDate(asOf),
        grantId: grant.grantId,
        funder: grant.funder,
        status: grant.status,
        complianceScore: grant.complianceScore,
        blockers: grant.obligationCounts.blocker,
        warnings: grant.obligationCounts.warning,
        exportDecision: grant.exportReadiness.decision
      },
      options.secret || DEFAULT_SECRET
    )
  );

  return {
    schemaVersion: "2026-05-16.enterprise-grant-portfolio-compliance.v1",
    asOf: formatDate(asOf),
    institution: portfolio.institution || null,
    summary,
    adminMetrics,
    grants,
    exportManifest,
    events
  };
}

function evaluateGrant(grant, asOf) {
  const mandates = grant.mandates || {};
  const projects = grant.projects || [];
  const obligations = [];

  for (const project of projects) {
    evaluateDataManagementPlan(grant, project, mandates, asOf, obligations);
    evaluateContributorIdentifiers(grant, project, mandates, asOf, obligations);

    for (const output of project.outputs || []) {
      evaluateOpenAccess(grant, project, output, mandates, asOf, obligations);
      evaluateRepositoryDeposit(grant, project, output, mandates, asOf, obligations);
      evaluatePersistentIdentifiers(grant, project, output, mandates, asOf, obligations);
    }
  }

  evaluateReports(grant, mandates, asOf, obligations);

  const obligationCounts = countBySeverity(obligations);
  const complianceScore = calculateComplianceScore(obligations);
  const riskLevel = calculateRiskLevel(obligationCounts, complianceScore);
  const exportReadiness = calculateExportReadiness(obligations, complianceScore);
  const actionQueue = obligations
    .filter((obligation) => obligation.severity !== "todo")
    .map((obligation) => ({
      severity: obligation.severity,
      scope: obligation.scope,
      title: obligation.title,
      owner: routeOwner(obligation.scope),
      dueDate: obligation.dueDate,
      remediation: obligation.remediation
    }));

  return {
    grantId: grant.grantId,
    awardNumber: grant.awardNumber,
    funder: grant.funder,
    program: grant.program,
    principalInvestigator: grant.principalInvestigator,
    department: grant.department,
    tags: grant.tags || [],
    status: exportReadiness.decision === "ready" ? "compliant" : exportReadiness.decision,
    riskLevel,
    complianceScore,
    obligationCounts,
    exportReadiness,
    obligations,
    actionQueue
  };
}

function evaluateDataManagementPlan(grant, project, mandates, asOf, obligations) {
  const dmpMandate = mandates.dataManagementPlan || {};

  if (!dmpMandate.required) {
    return;
  }

  const acceptedStatuses = new Set(dmpMandate.acceptedStatuses || Array.from(SATISFIED_DMP_STATUSES));
  const status = project.dataManagementPlan && project.dataManagementPlan.status;

  if (!acceptedStatuses.has(status)) {
    addObligation(obligations, {
      asOf,
      severity: "blocker",
      scope: "data-management-plan",
      grantId: grant.grantId,
      projectId: project.projectId,
      title: `Approve a data management plan for ${project.title}`,
      evidence: [`Current DMP status: ${status || "missing"}`],
      remediation: "Route the project DMP through the research office before funder export."
    });
  }
}

function evaluateContributorIdentifiers(grant, project, mandates, asOf, obligations) {
  if (!mandates.persistentIdentifiers || !mandates.persistentIdentifiers.orcidForContributors) {
    return;
  }

  const missing = (project.contributors || []).filter((contributor) => !contributor.orcid);

  if (missing.length > 0) {
    addObligation(obligations, {
      asOf,
      severity: "warning",
      scope: "orcid",
      grantId: grant.grantId,
      projectId: project.projectId,
      title: `Collect ORCID identifiers for ${missing.length} contributor(s)`,
      evidence: missing.map((contributor) => `${contributor.name} (${contributor.role})`),
      remediation: "Send ORCID sync tasks before generating the institutional funder report."
    });
  }
}

function evaluateOpenAccess(grant, project, output, mandates, asOf, obligations) {
  const openAccessMandate = mandates.openAccess || {};

  if (!openAccessMandate.required || !isPublicationOutput(output)) {
    return;
  }

  const status = output.openAccess && output.openAccess.status;

  if (SATISFIED_OPEN_ACCESS_STATUSES.has(status)) {
    const scheduledDate = output.openAccess.scheduledDate;

    if (status === "scheduled" && scheduledDate) {
      const publicationDate = output.publicationDate || scheduledDate;
      const deadline = addDays(publicationDate, openAccessMandate.deadlineDaysAfterPublication || 0);

      if (normalizeDate(scheduledDate).getTime() > normalizeDate(deadline).getTime()) {
        addObligation(obligations, {
          asOf,
          severity: "warning",
          scope: "open-access",
          grantId: grant.grantId,
          projectId: project.projectId,
          outputId: output.outputId,
          dueDate: deadline,
          title: `Open access release for ${output.title} is scheduled after the funder deadline`,
          evidence: [`Scheduled release: ${scheduledDate}`, `Deadline: ${deadline}`],
          remediation: "Move the release date earlier or capture an approved embargo exception."
        });
      }
    }

    return;
  }

  const dueDate = addDays(output.publicationDate || formatDate(asOf), openAccessMandate.deadlineDaysAfterPublication || 0);
  addObligation(obligations, {
    asOf,
    severity: daysUntil(asOf, dueDate) < 0 ? "blocker" : "warning",
    scope: "open-access",
    grantId: grant.grantId,
    projectId: project.projectId,
    outputId: output.outputId,
    dueDate,
    title: `Publish or schedule open access for ${output.title}`,
    evidence: [`Current open access status: ${status || "missing"}`],
    remediation: "Schedule repository or journal open access before the mandate deadline."
  });
}

function evaluateRepositoryDeposit(grant, project, output, mandates, asOf, obligations) {
  const depositMandate = mandates.repositoryDeposit || {};

  if (!depositMandate.required) {
    return;
  }

  const deposits = output.repositoryDeposits || [];
  const allowedRepositories = new Set(depositMandate.allowedRepositories || []);
  const matchingDeposit = deposits.find(
    (deposit) =>
      SATISFIED_DEPOSIT_STATUSES.has(deposit.status) &&
      (allowedRepositories.size === 0 || allowedRepositories.has(deposit.repository))
  );

  if (matchingDeposit) {
    return;
  }

  const dueDate = addDays(output.publicationDate || formatDate(asOf), depositMandate.deadlineDaysAfterPublication || 0);
  const attemptedRepositories = deposits.length
    ? deposits.map((deposit) => `${deposit.repository}:${deposit.status}`)
    : ["no repository deposit"];

  addObligation(obligations, {
    asOf,
    severity: daysUntil(asOf, dueDate) < 0 ? "blocker" : "warning",
    scope: "repository-deposit",
    grantId: grant.grantId,
    projectId: project.projectId,
    outputId: output.outputId,
    dueDate,
    title: `Deposit ${output.title} in an approved repository`,
    evidence: attemptedRepositories,
    remediation: `Use one of: ${Array.from(allowedRepositories).join(", ") || "the configured funder repositories"}.`
  });
}

function evaluatePersistentIdentifiers(grant, project, output, mandates, asOf, obligations) {
  const idMandate = mandates.persistentIdentifiers || {};
  const requiredKinds = new Set(idMandate.doiRequiredFor || []);

  if (!requiredKinds.has(output.kind) || output.doi) {
    return;
  }

  addObligation(obligations, {
    asOf,
    severity: "warning",
    scope: "doi",
    grantId: grant.grantId,
    projectId: project.projectId,
    outputId: output.outputId,
    title: `Register DOI evidence for ${output.title}`,
    evidence: [`Output kind ${output.kind} requires a DOI.`],
    remediation: "Mint or import the DOI before exporting to funder portals."
  });
}

function evaluateReports(grant, mandates, asOf, obligations) {
  for (const report of mandates.reports || []) {
    if (SATISFIED_REPORT_STATUSES.has(report.status)) {
      continue;
    }

    const days = daysUntil(asOf, report.dueDate);

    if (days < 0) {
      addObligation(obligations, {
        asOf,
        severity: "blocker",
        scope: "funder-report",
        grantId: grant.grantId,
        dueDate: report.dueDate,
        title: `${report.type} report is overdue`,
        evidence: [`Status: ${report.status}`, `${Math.abs(days)} day(s) overdue`],
        remediation: "Escalate to the PI and research office before any new export is certified."
      });
      continue;
    }

    if (days <= 14) {
      addObligation(obligations, {
        asOf,
        severity: "warning",
        scope: "funder-report",
        grantId: grant.grantId,
        dueDate: report.dueDate,
        title: `${report.type} report is due in ${days} day(s)`,
        evidence: [`Status: ${report.status}`],
        remediation: "Finish evidence collection and submit the report before the due date."
      });
      continue;
    }

    addObligation(obligations, {
      asOf,
      severity: "todo",
      scope: "funder-report",
      grantId: grant.grantId,
      dueDate: report.dueDate,
      title: `${report.type} report is scheduled`,
      evidence: [`Status: ${report.status}`, `Due in ${days} day(s)`],
      remediation: "Keep the report in the grant office calendar."
    });
  }
}

function buildAdminMetrics(grants) {
  const byDepartment = {};
  const byFunder = {};

  for (const grant of grants) {
    incrementMetric(byDepartment, grant.department, grant);
    incrementMetric(byFunder, grant.funder, grant);
  }

  return {
    byDepartment,
    byFunder,
    topRisks: grants
      .filter((grant) => grant.riskLevel !== "clear")
      .sort((left, right) => left.complianceScore - right.complianceScore)
      .slice(0, 5)
      .map((grant) => ({
        grantId: grant.grantId,
        riskLevel: grant.riskLevel,
        complianceScore: grant.complianceScore,
        blockers: grant.obligationCounts.blocker,
        warnings: grant.obligationCounts.warning
      }))
  };
}

function incrementMetric(target, key, grant) {
  const metricKey = key || "unknown";
  target[metricKey] ||= {
    grants: 0,
    ready: 0,
    blocked: 0,
    needsReview: 0,
    averageScore: 0
  };

  const metric = target[metricKey];
  metric.grants += 1;
  metric.ready += grant.exportReadiness.decision === "ready" ? 1 : 0;
  metric.blocked += grant.exportReadiness.decision === "blocked" ? 1 : 0;
  metric.needsReview += grant.exportReadiness.decision === "needs_review" ? 1 : 0;
  metric.averageScore = Math.round(((metric.averageScore * (metric.grants - 1)) + grant.complianceScore) / metric.grants);
}

function buildExportManifest(portfolio, grants) {
  return {
    generatedFor: portfolio.institution ? portfolio.institution.id : "unknown-institution",
    asOf: portfolio.asOf,
    readyGrantIds: grants.filter((grant) => grant.exportReadiness.decision === "ready").map((grant) => grant.grantId),
    blockedGrantIds: grants.filter((grant) => grant.exportReadiness.decision === "blocked").map((grant) => grant.grantId),
    needsReviewGrantIds: grants
      .filter((grant) => grant.exportReadiness.decision === "needs_review")
      .map((grant) => grant.grantId),
    requiredEvidence: [
      "approved data management plan",
      "open access release or scheduled release",
      "approved repository deposit",
      "DOI for funder-scoped outputs",
      "ORCID coverage for grant contributors",
      "current funder report status"
    ]
  };
}

function summarizeGrants(grants) {
  const summary = {
    totalGrants: grants.length,
    readyForExport: 0,
    needsReview: 0,
    blocked: 0,
    averageComplianceScore: 0,
    obligationCounts: {
      blocker: 0,
      warning: 0,
      todo: 0
    }
  };

  let scoreTotal = 0;
  for (const grant of grants) {
    scoreTotal += grant.complianceScore;
    summary.readyForExport += grant.exportReadiness.decision === "ready" ? 1 : 0;
    summary.needsReview += grant.exportReadiness.decision === "needs_review" ? 1 : 0;
    summary.blocked += grant.exportReadiness.decision === "blocked" ? 1 : 0;
    summary.obligationCounts.blocker += grant.obligationCounts.blocker;
    summary.obligationCounts.warning += grant.obligationCounts.warning;
    summary.obligationCounts.todo += grant.obligationCounts.todo;
  }

  summary.averageComplianceScore = grants.length ? Math.round(scoreTotal / grants.length) : 100;
  return summary;
}

function countBySeverity(obligations) {
  return obligations.reduce(
    (counts, obligation) => {
      counts[obligation.severity] += 1;
      return counts;
    },
    { blocker: 0, warning: 0, todo: 0 }
  );
}

function calculateComplianceScore(obligations) {
  const penalty = obligations.reduce(
    (total, obligation) => total + (PENALTY_BY_SEVERITY[obligation.severity] || 0),
    0
  );

  return Math.max(0, 100 - penalty);
}

function calculateRiskLevel(counts, complianceScore) {
  if (counts.blocker > 0 || complianceScore < 60) {
    return "critical";
  }

  if (counts.warning >= 2 || complianceScore < 80) {
    return "elevated";
  }

  if (counts.warning > 0 || counts.todo > 0) {
    return "watch";
  }

  return "clear";
}

function calculateExportReadiness(obligations, complianceScore) {
  const blockers = obligations.filter((obligation) => obligation.severity === "blocker");
  const warnings = obligations.filter((obligation) => obligation.severity === "warning");

  if (blockers.length > 0) {
    return {
      decision: "blocked",
      reason: `${blockers.length} blocker(s) must be resolved before funder export.`
    };
  }

  if (warnings.length > 0 || complianceScore < 90) {
    return {
      decision: "needs_review",
      reason: "No blockers, but research office review is required before certification."
    };
  }

  return {
    decision: "ready",
    reason: "All configured funder mandates are satisfied."
  };
}

function signEvent(payload, secret = DEFAULT_SECRET) {
  const canonicalPayload = stableStringify(payload);
  const digest = crypto.createHash("sha256").update(canonicalPayload).digest("hex");
  const signature = crypto.createHmac("sha256", secret).update(digest).digest("hex");

  return {
    ...payload,
    digest,
    signature
  };
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function routeOwner(scope) {
  const owners = {
    "data-management-plan": "Research data services",
    orcid: "Identity and profile sync",
    "open-access": "Scholarly communications",
    "repository-deposit": "Repository operations",
    doi: "Library publishing",
    "funder-report": "Sponsored programs"
  };

  return owners[scope] || "Research office";
}

function isPublicationOutput(output) {
  return ["article", "preprint", "manuscript", "dataset", "software"].includes(output.kind);
}

function addDays(dateValue, days) {
  const date = normalizeDate(dateValue);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

module.exports = {
  evaluatePortfolio,
  evaluateGrant,
  signEvent,
  stableStringify,
  daysUntil,
  addDays
};
