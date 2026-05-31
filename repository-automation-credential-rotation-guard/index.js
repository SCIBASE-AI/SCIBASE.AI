import { createHash } from "node:crypto";

const DAY_MS = 24 * 60 * 60 * 1000;

function parseTimestamp(value, fieldName) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }
  return date;
}

function daysBetween(earlier, later) {
  return Math.floor((later.getTime() - earlier.getTime()) / DAY_MS);
}

function hasWildcardRef(credential) {
  return credential.allowedRefs.some((ref) => ref === "*" || ref.endsWith("/*"));
}

function missingProtectedReleaseRef(credential, policy) {
  if (!credential.environments.includes("release")) {
    return false;
  }
  return !policy.protectedReleaseRefs.some((requiredRef) =>
    credential.allowedRefs.includes(requiredRef)
  );
}

function allowedScopesForCredential(credential, policy) {
  return new Set(
    credential.environments.flatMap(
      (environment) => policy.allowedEnvironmentScopes[environment] ?? []
    )
  );
}

function collectEvidenceGaps(credential, policy) {
  const evidence = credential.evidence ?? {};
  return policy.requiredEvidence.filter((field) => !evidence[field]);
}

function isPrivilegedScope(scope, policy) {
  return policy.privilegedScopes.includes(scope) || scope.endsWith(":delete");
}

function finding(severity, code, message, remediation) {
  return { severity, code, message, remediation };
}

export function evaluateCredential(credential, project, policy, asOf = new Date()) {
  const rotationLimit = policy.maxRotationAgeDays[credential.type];
  if (!rotationLimit) {
    throw new Error(`No rotation policy configured for credential type ${credential.type}`);
  }

  const lastRotated = parseTimestamp(credential.lastRotatedAt, `${credential.id}.lastRotatedAt`);
  const expiresAt = parseTimestamp(credential.expiresAt, `${credential.id}.expiresAt`);
  const lastUsed = parseTimestamp(credential.lastUsedAt, `${credential.id}.lastUsedAt`);
  const ownerConfirmed = parseTimestamp(
    credential.ownerConfirmedAt,
    `${credential.id}.ownerConfirmedAt`
  );
  const releaseWindow = parseTimestamp(project.releaseWindowStart, `${project.projectId}.releaseWindowStart`);

  const rotationAgeDays = daysBetween(lastRotated, asOf);
  const ownerAgeDays = daysBetween(ownerConfirmed, asOf);
  const dormantDays = daysBetween(lastUsed, asOf);
  const daysUntilExpiryAtRelease = daysBetween(releaseWindow, expiresAt);
  const allowedScopes = allowedScopesForCredential(credential, policy);
  const unauthorizedScopes = credential.scopes.filter((scope) => !allowedScopes.has(scope));
  const privilegedScopes = credential.scopes.filter((scope) => isPrivilegedScope(scope, policy));
  const evidenceGaps = collectEvidenceGaps(credential, policy);
  const findings = [];

  if (rotationAgeDays > rotationLimit) {
    findings.push(
      finding(
        rotationAgeDays > rotationLimit * 1.5 ? "critical" : "high",
        "rotation-stale",
        `${credential.id} is ${rotationAgeDays} days from last rotation; limit is ${rotationLimit} days.`,
        "Rotate the credential and attach fresh attestation evidence before release."
      )
    );
  }

  if (daysUntilExpiryAtRelease < policy.minDaysUntilExpiryForRelease) {
    findings.push(
      finding(
        daysUntilExpiryAtRelease < 0 ? "critical" : "high",
        "release-expiry-risk",
        `${credential.id} has ${daysUntilExpiryAtRelease} days of validity after the release window starts.`,
        "Replace the credential with one that remains valid beyond the release rollback window."
      )
    );
  }

  if (ownerAgeDays > policy.maxOwnerAttestationAgeDays) {
    findings.push(
      finding(
        "medium",
        "owner-attestation-stale",
        `${credential.id} owner attestation is ${ownerAgeDays} days old.`,
        "Refresh owner confirmation and verify the current business owner."
      )
    );
  }

  if (dormantDays > policy.maxDormantDays) {
    findings.push(
      finding(
        "medium",
        "dormant-credential",
        `${credential.id} has not been used for ${dormantDays} days.`,
        "Disable dormant credentials or document a release-specific need."
      )
    );
  }

  if (unauthorizedScopes.length > 0) {
    findings.push(
      finding(
        "high",
        "scope-outside-environment-policy",
        `${credential.id} includes scopes not approved for its environments: ${unauthorizedScopes.join(", ")}.`,
        "Reduce scopes to the environment allowlist or move the credential to the correct environment."
      )
    );
  }

  if (privilegedScopes.length > 0) {
    findings.push(
      finding(
        "high",
        "privileged-automation-scope",
        `${credential.id} includes privileged automation scopes: ${privilegedScopes.join(", ")}.`,
        "Replace broad write/admin scopes with release-specific OIDC or app installation grants."
      )
    );
  }

  if (hasWildcardRef(credential)) {
    findings.push(
      finding(
        "critical",
        "wildcard-ref-access",
        `${credential.id} can run against wildcard repository refs.`,
        "Restrict the credential to protected release branches and signed release tags."
      )
    );
  }

  if (missingProtectedReleaseRef(credential, policy)) {
    findings.push(
      finding(
        "medium",
        "missing-protected-release-ref",
        `${credential.id} does not explicitly cover the protected main branch or release tag pattern.`,
        "Declare the exact protected refs this release credential is allowed to touch."
      )
    );
  }

  if (credential.secretScanStatus !== "clean") {
    findings.push(
      finding(
        "high",
        "secret-scan-not-clean",
        `${credential.id} secret scan status is ${credential.secretScanStatus}.`,
        "Run a clean secret scan and attach the result before release."
      )
    );
  }

  if (evidenceGaps.length > 0) {
    findings.push(
      finding(
        "medium",
        "missing-rotation-evidence",
        `${credential.id} is missing required evidence: ${evidenceGaps.join(", ")}.`,
        "Attach ticket, runbook, and deterministic attestation hash evidence."
      )
    );
  }

  const severityCounts = findings.reduce(
    (counts, item) => {
      counts[item.severity] += 1;
      return counts;
    },
    { critical: 0, high: 0, medium: 0, low: 0 }
  );
  const decision =
    severityCounts.critical > 0
      ? "hold"
      : severityCounts.high > 0
        ? "rotate"
        : severityCounts.medium > 0
          ? "review"
          : "release";

  return {
    credentialId: credential.id,
    type: credential.type,
    owner: credential.owner,
    environments: credential.environments,
    decision,
    rotationAgeDays,
    daysUntilExpiryAtRelease,
    severityCounts,
    findings
  };
}

export function evaluateProject(project, policy, asOf = new Date()) {
  const credentialReports = project.credentials.map((credential) =>
    evaluateCredential(credential, project, policy, asOf)
  );
  const severityCounts = credentialReports.reduce(
    (counts, report) => {
      for (const [severity, count] of Object.entries(report.severityCounts)) {
        counts[severity] += count;
      }
      return counts;
    },
    { critical: 0, high: 0, medium: 0, low: 0 }
  );
  const decision = credentialReports.some((report) => report.decision === "hold")
    ? "hold-release"
    : credentialReports.some((report) => report.decision === "rotate")
      ? "rotate-before-release"
      : credentialReports.some((report) => report.decision === "review")
        ? "review-before-release"
        : "release-ready";

  return {
    projectId: project.projectId,
    repository: project.repository,
    releaseCandidate: project.releaseCandidate,
    releaseWindowStart: project.releaseWindowStart,
    decision,
    severityCounts,
    credentialReports
  };
}

export function buildReviewerPacket(projectReports, asOf = new Date()) {
  const totals = projectReports.reduce(
    (summary, report) => {
      summary.projects += 1;
      summary.credentials += report.credentialReports.length;
      summary.decisions[report.decision] = (summary.decisions[report.decision] ?? 0) + 1;
      for (const [severity, count] of Object.entries(report.severityCounts)) {
        summary.severityCounts[severity] += count;
      }
      return summary;
    },
    {
      projects: 0,
      credentials: 0,
      decisions: {},
      severityCounts: { critical: 0, high: 0, medium: 0, low: 0 }
    }
  );

  const payload = {
    generatedAt: asOf.toISOString(),
    summary: totals,
    projectReports
  };
  const digest = createHash("sha256").update(JSON.stringify(payload)).digest("hex");

  return {
    ...payload,
    auditDigest: `sha256:${digest}`
  };
}

export function runCredentialRotationReview(projects, policy, reviewDate) {
  const asOf = parseTimestamp(reviewDate, "reviewDate");
  const projectReports = projects.map((project) => evaluateProject(project, policy, asOf));
  return buildReviewerPacket(projectReports, asOf);
}
