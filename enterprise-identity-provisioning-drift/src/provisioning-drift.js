const crypto = require("node:crypto");

const DAY_MS = 24 * 60 * 60 * 1000;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function daysBetween(a, b) {
  return Math.floor((new Date(a).getTime() - new Date(b).getTime()) / DAY_MS);
}

function byEmail(records) {
  return new Map(records.map((record) => [normalizeEmail(record.email), record]));
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

function signWebhook(signingSeed, body) {
  return crypto.createHmac("sha256", signingSeed).update(stableJson(body)).digest("hex");
}

function buildDriftFinding(kind, severity, email, message, evidence, action) {
  return {
    id: digest({ kind, email, message }).slice(0, 16),
    kind,
    severity,
    email,
    message,
    evidence,
    action
  };
}

function evaluateProvisioningDrift(input) {
  const generatedAt = input.generatedAt || new Date().toISOString();
  const hris = byEmail(input.hrisPeople || []);
  const saml = byEmail(input.samlSubjects || []);
  const scim = byEmail(input.scimUsers || []);
  const orcid = byEmail(input.orcidProfiles || []);
  const platform = byEmail(input.platformUsers || []);
  const findings = [];

  for (const user of input.platformUsers || []) {
    const email = normalizeEmail(user.email);
    const hrisPerson = hris.get(email);
    const samlSubject = saml.get(email);
    const scimUser = scim.get(email);
    const orcidProfile = user.orcid ? orcid.get(email) : null;

    if (!hrisPerson) {
      findings.push(
        buildDriftFinding(
          "missing_hris_record",
          "high",
          email,
          "Platform user has no matching HRIS person record.",
          { userId: user.userId, role: user.role },
          "route_to_identity_admin"
        )
      );
    } else if (hrisPerson.status !== "active" && user.status === "active") {
      findings.push(
        buildDriftFinding(
          "terminated_user_active_access",
          "critical",
          email,
          "HRIS marks this person inactive while SCIBASE access remains active.",
          { employeeId: hrisPerson.employeeId, terminatedAt: hrisPerson.terminatedAt || null },
          "disable_platform_user_and_revoke_project_access"
        )
      );
    }

    if (!samlSubject) {
      findings.push(
        buildDriftFinding(
          "missing_saml_subject",
          "medium",
          email,
          "Platform user lacks a SAML subject mapping for institutional SSO.",
          { userId: user.userId },
          "request_sso_linking"
        )
      );
    } else {
      if (!samlSubject.mfa) {
        findings.push(
          buildDriftFinding(
            "mfa_not_enforced",
            "high",
            email,
            "SAML subject is active but MFA is not enforced.",
            { nameId: samlSubject.nameId, lastLoginAt: samlSubject.lastLoginAt },
            "require_mfa_before_sensitive_project_access"
          )
        );
      }
      if (hrisPerson && samlSubject.department !== hrisPerson.department) {
        findings.push(
          buildDriftFinding(
            "department_mapping_drift",
            "medium",
            email,
            "SAML department differs from HRIS department.",
            { samlDepartment: samlSubject.department, hrisDepartment: hrisPerson.department },
            "refresh_department_claims"
          )
        );
      }
    }

    if (!scimUser) {
      findings.push(
        buildDriftFinding(
          "missing_scim_user",
          "high",
          email,
          "Platform user lacks an active SCIM provisioning record.",
          { userId: user.userId },
          "reconcile_scim_directory"
        )
      );
    } else if (!scimUser.active && user.status === "active") {
      findings.push(
        buildDriftFinding(
          "inactive_scim_active_access",
          "critical",
          email,
          "SCIM user is inactive while platform account remains active.",
          { externalId: scimUser.externalId },
          "disable_platform_user"
        )
      );
    }

    if (!user.orcid) {
      findings.push(
        buildDriftFinding(
          "missing_orcid_link",
          "low",
          email,
          "Researcher profile is missing ORCID linkage.",
          { userId: user.userId },
          "prompt_researcher_orcid_link"
        )
      );
    } else if (!orcidProfile) {
      findings.push(
        buildDriftFinding(
          "orcid_profile_not_verified",
          "medium",
          email,
          "Platform ORCID value has no matching verified ORCID sync payload.",
          { orcid: user.orcid },
          "refresh_orcid_sync"
        )
      );
    } else if (daysBetween(generatedAt, orcidProfile.updatedAt) > 90) {
      findings.push(
        buildDriftFinding(
          "stale_orcid_sync",
          "low",
          email,
          "ORCID employment evidence is older than 90 days.",
          { orcid: orcidProfile.orcid, updatedAt: orcidProfile.updatedAt },
          "schedule_orcid_refresh"
        )
      );
    }

    if (daysBetween(generatedAt, user.lastAccessReviewAt) > (input.institution?.reviewWindowDays || 30)) {
      findings.push(
        buildDriftFinding(
          "access_review_overdue",
          "medium",
          email,
          "Institutional access review is overdue.",
          { lastAccessReviewAt: user.lastAccessReviewAt },
          "add_to_access_review_queue"
        )
      );
    }
  }

  for (const scimUser of input.scimUsers || []) {
    const email = normalizeEmail(scimUser.email);
    if (scimUser.active && !platform.has(email)) {
      findings.push(
        buildDriftFinding(
          "unclaimed_scim_identity",
          "medium",
          email,
          "SCIM has an active user that does not exist in SCIBASE.",
          { externalId: scimUser.externalId, groups: scimUser.groups || [] },
          "review_before_auto_invite"
        )
      );
    }
  }

  const projectActions = buildProjectAccessActions(input.projectAccess || [], findings);
  const accessReviewQueue = buildAccessReviewQueue(input.platformUsers || [], findings, projectActions);
  const webhookEvents = buildWebhookEvents(input.institution || {}, generatedAt, findings, projectActions);
  const summary = buildSummary(findings, projectActions, accessReviewQueue);

  return {
    generatedAt,
    institutionId: input.institution?.id || "unknown",
    summary,
    findings,
    projectActions,
    accessReviewQueue,
    webhookEvents,
    auditDigest: digest({ generatedAt, findings, projectActions, accessReviewQueue, webhookEvents })
  };
}

function buildProjectAccessActions(projectAccess, findings) {
  const criticalEmails = new Set(
    findings
      .filter((finding) => finding.severity === "critical")
      .map((finding) => finding.email)
  );
  const reviewEmails = new Set(
    findings
      .filter((finding) => ["access_review_overdue", "mfa_not_enforced", "missing_hris_record"].includes(finding.kind))
      .map((finding) => finding.email)
  );

  const actions = [];
  for (const project of projectAccess) {
    for (const member of project.members || []) {
      const email = normalizeEmail(member.email);
      if (criticalEmails.has(email)) {
        actions.push({
          projectId: project.projectId,
          projectTitle: project.title,
          funderTag: project.funderTag,
          email,
          access: member.access,
          decision: "revoke_now",
          reason: "Critical identity drift affects active project access."
        });
      } else if (reviewEmails.has(email)) {
        actions.push({
          projectId: project.projectId,
          projectTitle: project.title,
          funderTag: project.funderTag,
          email,
          access: member.access,
          decision: "recertify",
          reason: "Identity signal requires manager or research-office review."
        });
      }
    }
  }
  return actions;
}

function buildAccessReviewQueue(platformUsers, findings, projectActions) {
  const byUser = new Map();
  for (const user of platformUsers) {
    byUser.set(normalizeEmail(user.email), {
      email: normalizeEmail(user.email),
      displayName: user.displayName,
      role: user.role,
      severity: "none",
      findings: [],
      projects: []
    });
  }

  for (const finding of findings) {
    const item = byUser.get(finding.email) || {
      email: finding.email,
      displayName: finding.email,
      role: "unknown",
      severity: "none",
      findings: [],
      projects: []
    };
    item.findings.push({ kind: finding.kind, severity: finding.severity, action: finding.action });
    item.severity = maxSeverity(item.severity, finding.severity);
    byUser.set(finding.email, item);
  }

  for (const action of projectActions) {
    const item = byUser.get(action.email);
    if (item) {
      item.projects.push({
        projectId: action.projectId,
        access: action.access,
        decision: action.decision
      });
    }
  }

  return [...byUser.values()]
    .filter((item) => item.findings.length || item.projects.length)
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.email.localeCompare(b.email));
}

function buildWebhookEvents(institution, generatedAt, findings, projectActions) {
  const signingSeed = institution.webhookSigningSeed || "demo-signing-seed";
  const eventBodies = [
    {
      type: "identity.drift.detected",
      institutionId: institution.id || "unknown",
      generatedAt,
      findingCount: findings.length,
      criticalCount: findings.filter((finding) => finding.severity === "critical").length
    },
    {
      type: "access.review.required",
      institutionId: institution.id || "unknown",
      generatedAt,
      reviewSubjects: [...new Set(projectActions.map((action) => action.email))].sort(),
      actionCount: projectActions.length
    }
  ];

  return eventBodies.map((body) => ({
    id: digest(body).slice(0, 18),
    body,
    headers: {
      "x-scibase-event": body.type,
      "x-scibase-signature": signWebhook(signingSeed, body)
    }
  }));
}

function buildSummary(findings, projectActions, accessReviewQueue) {
  const bySeverity = findings.reduce((acc, finding) => {
    acc[finding.severity] = (acc[finding.severity] || 0) + 1;
    return acc;
  }, {});
  return {
    totalFindings: findings.length,
    criticalFindings: bySeverity.critical || 0,
    highFindings: bySeverity.high || 0,
    mediumFindings: bySeverity.medium || 0,
    lowFindings: bySeverity.low || 0,
    projectActions: projectActions.length,
    revokeNow: projectActions.filter((action) => action.decision === "revoke_now").length,
    accessReviewSubjects: accessReviewQueue.length,
    status: bySeverity.critical ? "block_access_until_remediated" : findings.length ? "review_required" : "healthy"
  };
}

function severityRank(severity) {
  return { none: 0, low: 1, medium: 2, high: 3, critical: 4 }[severity] || 0;
}

function maxSeverity(a, b) {
  return severityRank(a) >= severityRank(b) ? a : b;
}

module.exports = {
  evaluateProvisioningDrift,
  digest,
  signWebhook,
  normalizeEmail,
  stableJson
};
