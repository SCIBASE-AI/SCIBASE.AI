"use strict";

function byId(items) {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function hasText(haystack, needle) {
  return String(haystack || "").toLowerCase().includes(String(needle || "").toLowerCase());
}

function evaluateFunding(project) {
  const acknowledgement = project.citationMetadata.fundingAcknowledgement || "";
  return project.fundingSources.map((source) => {
    const missingGrantId = !source.grantId;
    const missingAcknowledgement = source.publicAcknowledgementRequired && !hasText(acknowledgement, source.requiredText);
    const missingDoi = source.requiresDoiBeforePublication && !project.citationMetadata.doi;
    const evidence = project.auditEvents.filter((event) => event.targetId === source.id);
    const blockers = [];

    if (missingGrantId) blockers.push("grant id missing");
    if (missingAcknowledgement) blockers.push("required acknowledgement missing");
    if (missingDoi) blockers.push("DOI required before publication");
    if (!evidence.length) blockers.push("funding link lacks audit evidence");

    return {
      fundingSourceId: source.id,
      funder: source.funder,
      grantId: source.grantId || "missing",
      readiness: blockers.length ? "blocked" : "ready",
      blockers,
      auditEventIds: evidence.map((event) => event.id)
    };
  });
}

function evaluateInstitutions(project) {
  const institutionMap = byId(project.linkedInstitutions);
  return project.collaborators.map((collaborator) => {
    const institution = institutionMap[collaborator.institutionId];
    const blockers = [];
    if (!institution) {
      blockers.push("linked institution missing");
    } else if (collaborator.emailDomain !== institution.verifiedDomain) {
      blockers.push("email domain does not match institution domain");
    }
    if (!collaborator.orcidLinked && ["owner", "contributor"].includes(collaborator.role)) {
      blockers.push("ORCID link missing for attributed contributor");
    }
    return {
      collaboratorId: collaborator.id,
      name: collaborator.name,
      role: collaborator.role,
      institution: institution ? institution.name : "missing",
      readiness: blockers.length ? "needs-review" : "ready",
      blockers
    };
  });
}

function evaluateCitationMetadata(project) {
  const blockers = [];
  const warnings = [];
  const institutions = project.linkedInstitutions.map((institution) => institution.name);
  const authors = project.collaborators
    .filter((collaborator) => ["owner", "contributor"].includes(collaborator.role))
    .map((collaborator) => collaborator.name);

  if (!project.citationMetadata.title) blockers.push("citation title missing");
  if (!project.citationMetadata.doi) warnings.push("DOI missing for export-ready citation metadata");
  const missingAuthors = authors.filter((author) => !(project.citationMetadata.authors || []).includes(author));
  if (missingAuthors.length) blockers.push(`citation authors missing: ${missingAuthors.join(", ")}`);
  const missingInstitutions = institutions.filter((institution) => !(project.citationMetadata.institutions || []).includes(institution));
  if (missingInstitutions.length) warnings.push(`citation institutions missing: ${missingInstitutions.join(", ")}`);

  return {
    readiness: blockers.length ? "blocked" : warnings.length ? "ready-with-warnings" : "ready",
    blockers,
    warnings
  };
}

function evaluateProfileExposure(project, institutionEvaluations, fundingEvaluations) {
  const findings = [];
  const publicProject = project.visibility === "public";
  const blockedFunding = fundingEvaluations.filter((item) => item.readiness === "blocked");
  const exposedReviewers = project.collaborators.filter((collaborator) => collaborator.role === "reviewer" && collaborator.publicProfile);
  const affiliationIssues = institutionEvaluations.filter((item) => item.blockers.length);

  if (publicProject && blockedFunding.length) {
    findings.push({
      severity: "high",
      code: "public-project-funding-blocker",
      message: "Public project visibility is blocked by incomplete funding attribution.",
      evidence: blockedFunding.map((item) => `${item.fundingSourceId}: ${item.blockers.join("; ")}`),
      action: "Complete funding acknowledgements, grant IDs, DOI requirements, and audit evidence before public release."
    });
  }
  if (exposedReviewers.length) {
    findings.push({
      severity: "medium",
      code: "reviewer-profile-exposure",
      message: "Reviewer profile exposure should be checked before public project display.",
      evidence: exposedReviewers.map((collaborator) => collaborator.name),
      action: "Confirm reviewer profile visibility matches project policy before publication."
    });
  }
  if (affiliationIssues.length) {
    findings.push({
      severity: "medium",
      code: "affiliation-mismatch",
      message: "Some collaborators have institution attribution issues.",
      evidence: affiliationIssues.map((item) => `${item.name}: ${item.blockers.join("; ")}`),
      action: "Resolve ORCID and institution-domain mismatches before final attribution."
    });
  }

  return findings;
}

function evaluateProjectFundingAttribution(project) {
  const funding = evaluateFunding(project);
  const institutions = evaluateInstitutions(project);
  const citation = evaluateCitationMetadata(project);
  const profileFindings = evaluateProfileExposure(project, institutions, funding);
  const findings = [...profileFindings];

  if (citation.readiness === "blocked") {
    findings.push({
      severity: "high",
      code: "citation-metadata-blocked",
      message: "Project citation metadata is missing required attribution fields.",
      evidence: citation.blockers,
      action: "Complete author and citation metadata before DOI or public export."
    });
  }
  if (citation.warnings.length) {
    findings.push({
      severity: "low",
      code: "citation-metadata-warning",
      message: "Citation metadata is usable but not export-ready.",
      evidence: citation.warnings,
      action: "Resolve citation warnings before repository export or DOI registration."
    });
  }

  const blockedFunding = funding.filter((item) => item.readiness === "blocked").length;
  const institutionIssues = institutions.filter((item) => item.readiness !== "ready").length;
  const readinessScore = Math.max(
    0,
    Math.min(
      100,
      100 -
        blockedFunding * 18 -
        institutionIssues * 12 -
        (citation.readiness === "blocked" ? 20 : 0) -
        citation.warnings.length * 6 -
        findings.filter((finding) => finding.severity === "high").length * 8
    )
  );

  return {
    projectId: project.id,
    generatedBy: "project-funding-attribution-guard",
    readiness: readinessScore >= 78 ? "ready-with-review" : "needs-attribution-fixes",
    readinessScore,
    metrics: {
      fundingSources: funding.length,
      blockedFundingSources: blockedFunding,
      collaborators: institutions.length,
      collaboratorAttributionIssues: institutionIssues,
      findings: findings.length
    },
    funding,
    institutions,
    citation,
    findings,
    reviewerActions: unique(findings.map((finding) => finding.action)),
    auditDigest: [
      `${funding.length} funding sources evaluated`,
      `${blockedFunding} blocked funding sources`,
      `${institutions.length} collaborator affiliations evaluated`,
      `${institutionIssues} collaborator attribution issues`,
      `${findings.length} reviewer findings`
    ]
  };
}

function renderReviewerMarkdown(audit) {
  const lines = [
    "# Project Funding Attribution Guard",
    "",
    `Project: ${audit.projectId}`,
    `Readiness: ${audit.readiness} (${audit.readinessScore}/100)`,
    "",
    "## Metrics",
    "",
    `- Funding sources: ${audit.metrics.fundingSources}`,
    `- Blocked funding sources: ${audit.metrics.blockedFundingSources}`,
    `- Collaborators: ${audit.metrics.collaborators}`,
    `- Attribution issues: ${audit.metrics.collaboratorAttributionIssues}`,
    "",
    "## Findings",
    ""
  ];
  audit.findings.forEach((finding) => {
    lines.push(`- [${finding.severity}] ${finding.code}: ${finding.message}`);
    lines.push(`  Action: ${finding.action}`);
  });
  lines.push("", "## Funding Sources", "");
  audit.funding.forEach((source) => {
    lines.push(`- ${source.fundingSourceId}: ${source.readiness} (${source.blockers.join("; ") || "no blockers"})`);
  });
  return `${lines.join("\n")}\n`;
}

function renderSvgSummary(audit) {
  const barWidth = Math.round((audit.readinessScore / 100) * 760);
  const findingLines = audit.findings.slice(0, 5).map((finding, index) => {
    const y = 318 + index * 34;
    return `<text x="60" y="${y}" fill="#0f172a" font-size="19">${finding.severity.toUpperCase()} ${finding.code}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#f8fafc"/>
  <text x="60" y="76" fill="#0f172a" font-size="34" font-family="Arial, sans-serif" font-weight="700">Project Funding Attribution Guard</text>
  <text x="60" y="120" fill="#334155" font-size="22" font-family="Arial, sans-serif">Readiness: ${audit.readiness} (${audit.readinessScore}/100)</text>
  <rect x="60" y="158" width="760" height="34" rx="4" fill="#e2e8f0"/>
  <rect x="60" y="158" width="${barWidth}" height="34" rx="4" fill="#2563eb"/>
  <text x="60" y="244" fill="#0f172a" font-size="22" font-family="Arial, sans-serif">Blocked funding ${audit.metrics.blockedFundingSources} | Attribution issues ${audit.metrics.collaboratorAttributionIssues}</text>
  <text x="60" y="286" fill="#334155" font-size="20" font-family="Arial, sans-serif">Reviewer findings</text>
  ${findingLines}
</svg>
`;
}

module.exports = {
  evaluateProjectFundingAttribution,
  renderReviewerMarkdown,
  renderSvgSummary,
  evaluateFunding,
  evaluateInstitutions,
  evaluateCitationMetadata
};
