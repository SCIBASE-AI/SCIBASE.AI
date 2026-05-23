const ROLE_EVIDENCE_TYPES = {
  "Conceptualization": ["protocol", "manuscript", "hypothesis"],
  "Data curation": ["dataset", "data-dictionary", "metadata"],
  "Formal analysis": ["code", "notebook", "results"],
  "Funding acquisition": ["grant", "funder-award", "budget"],
  "Investigation": ["protocol", "dataset", "notebook"],
  "Methodology": ["protocol", "manuscript", "code"],
  "Peer review": ["peer-review", "inline-comment", "review-decision"],
  "Project administration": ["project-plan", "milestone", "review-decision"],
  "Resources": ["dataset", "material", "instrument"],
  "Software": ["code", "test", "notebook"],
  "Supervision": ["protocol", "approval", "project-plan"],
  "Validation": ["test", "reproducibility-report", "notebook", "results"],
  "Visualization": ["figure", "plot", "notebook"],
  "Writing - original draft": ["manuscript", "preprint"],
  "Writing - review & editing": ["manuscript", "inline-comment", "peer-review"],
};

const HOLD = "hold";
const REJECT = "reject";
const APPROVE = "approve";

function byId(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function toTimestamp(value) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function duplicateKey(claim) {
  return [
    claim.projectId,
    claim.contributorId,
    claim.role,
    [...claim.evidenceIds].sort().join("+"),
  ].join("|");
}

function makeFinding(code, severity, message, remediation) {
  return { code, severity, message, remediation };
}

export function evaluateCreditClaims({ projects, artifacts, claims }, options = {}) {
  const projectIndex = byId(projects);
  const artifactIndex = byId(artifacts);
  const duplicateCounts = new Map();
  const freshnessDays = options.freshnessDays ?? 120;
  const now = toTimestamp(options.now ?? "2026-05-22T12:00:00Z");

  for (const claim of claims) {
    const key = duplicateKey(claim);
    duplicateCounts.set(key, (duplicateCounts.get(key) ?? 0) + 1);
  }

  const decisions = claims.map((claim) =>
    evaluateSingleClaim({
      claim,
      project: projectIndex.get(claim.projectId),
      artifacts: claim.evidenceIds.map((id) => artifactIndex.get(id)).filter(Boolean),
      missingEvidenceIds: claim.evidenceIds.filter((id) => !artifactIndex.has(id)),
      duplicateCount: duplicateCounts.get(duplicateKey(claim)) ?? 0,
      freshnessDays,
      now,
    }),
  );

  const summary = decisions.reduce(
    (acc, decision) => {
      acc[decision.decision] += 1;
      acc.totalFindings += decision.findings.length;
      acc.riskScore += decision.riskScore;
      return acc;
    },
    { approve: 0, hold: 0, reject: 0, totalFindings: 0, riskScore: 0 },
  );

  return {
    generatedAt: new Date(now).toISOString(),
    summary,
    decisions,
  };
}

export function evaluateSingleClaim({
  claim,
  project,
  artifacts,
  missingEvidenceIds,
  duplicateCount,
  freshnessDays,
  now,
}) {
  const findings = [];
  const allowedTypes = ROLE_EVIDENCE_TYPES[claim.role];

  if (!project) {
    findings.push(
      makeFinding(
        "unknown-project",
        REJECT,
        `Project ${claim.projectId} does not exist in the repository index.`,
        "Attach the claim to a known project before credit is published.",
      ),
    );
  }

  if (!allowedTypes) {
    findings.push(
      makeFinding(
        "unsupported-credit-role",
        REJECT,
        `Role "${claim.role}" is not in the supported CRediT role map.`,
        "Normalize the role to a supported taxonomy value.",
      ),
    );
  }

  if (!claim.consentGranted) {
    findings.push(
      makeFinding(
        "missing-profile-consent",
        HOLD,
        `${claim.contributorName} has not consented to publish this credit in ${claim.profileVisibility}.`,
        "Collect contributor consent or keep the credit internal.",
      ),
    );
  }

  if (missingEvidenceIds.length > 0) {
    findings.push(
      makeFinding(
        "missing-evidence",
        REJECT,
        `Claim references missing evidence: ${missingEvidenceIds.join(", ")}.`,
        "Attach existing artifact ids with stable hashes.",
      ),
    );
  }

  if (artifacts.length === 0) {
    findings.push(
      makeFinding(
        "empty-evidence-set",
        REJECT,
        "No artifact evidence is attached to the contribution claim.",
        "Attach at least one artifact matching the claimed role.",
      ),
    );
  }

  if (allowedTypes && artifacts.length > 0) {
    const matchedTypes = artifacts.filter((artifact) => allowedTypes.includes(artifact.type));
    if (matchedTypes.length === 0) {
      findings.push(
        makeFinding(
          "role-evidence-mismatch",
          HOLD,
          `Role "${claim.role}" expects ${allowedTypes.join(", ")} evidence, but got ${artifacts.map((artifact) => artifact.type).join(", ")}.`,
          "Attach role-appropriate evidence or change the claimed role.",
        ),
      );
    }
  }

  if (project?.authors.includes(claim.contributorId) && claim.role === "Peer review") {
    findings.push(
      makeFinding(
        "author-review-credit-conflict",
        REJECT,
        "A project author cannot receive peer-review reputation credit for reviewing their own project.",
        "Route the review to an independent reviewer or record it as author response work.",
      ),
    );
  }

  if (
    claim.profileVisibility === "public" &&
    artifacts.some((artifact) => artifact.visibility === "blind-review")
  ) {
    findings.push(
      makeFinding(
        "blind-review-identity-leak",
        HOLD,
        "Public profile credit is backed by blind-review evidence that could expose reviewer identity.",
        "Publish an anonymized receipt or keep the credit private until the review mode permits disclosure.",
      ),
    );
  }

  if (duplicateCount > 1) {
    findings.push(
      makeFinding(
        "duplicate-credit-claim",
        HOLD,
        "Another claim uses the same contributor, role, project, and evidence set.",
        "Deduplicate before computing profile reputation deltas.",
      ),
    );
  }

  const staleArtifacts = artifacts.filter((artifact) => {
    const artifactTime = toTimestamp(artifact.createdAt);
    if (!artifactTime || !now) return false;
    const ageDays = (now - artifactTime) / (1000 * 60 * 60 * 24);
    return ageDays > freshnessDays;
  });

  if (staleArtifacts.length > 0) {
    findings.push(
      makeFinding(
        "stale-evidence",
        HOLD,
        `Evidence is older than ${freshnessDays} days: ${staleArtifacts.map((artifact) => artifact.id).join(", ")}.`,
        "Refresh evidence hashes or add a maintainer attestation before publishing new reputation changes.",
      ),
    );
  }

  const hasReject = findings.some((finding) => finding.severity === REJECT);
  const hasHold = findings.some((finding) => finding.severity === HOLD);
  const decision = hasReject ? REJECT : hasHold ? HOLD : APPROVE;
  const riskScore = findings.reduce((score, finding) => score + (finding.severity === REJECT ? 8 : 3), 0);

  return {
    claimId: claim.id,
    contributorId: claim.contributorId,
    contributorName: claim.contributorName,
    projectId: claim.projectId,
    role: claim.role,
    decision,
    riskScore,
    evidenceIds: claim.evidenceIds,
    findings,
  };
}

export function buildMarkdownReport(result) {
  const lines = [
    "# Credit Role Evidence Consistency Report",
    "",
    `Generated: ${result.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Approved: ${result.summary.approve}`,
    `- Held for steward review: ${result.summary.hold}`,
    `- Rejected before publication: ${result.summary.reject}`,
    `- Findings: ${result.summary.totalFindings}`,
    `- Aggregate risk score: ${result.summary.riskScore}`,
    "",
    "## Decisions",
    "",
  ];

  for (const decision of result.decisions) {
    lines.push(`### ${decision.claimId}: ${decision.decision.toUpperCase()}`);
    lines.push("");
    lines.push(`- Contributor: ${decision.contributorName} (${decision.contributorId})`);
    lines.push(`- Project: ${decision.projectId}`);
    lines.push(`- Role: ${decision.role}`);
    lines.push(`- Risk score: ${decision.riskScore}`);
    if (decision.findings.length === 0) {
      lines.push("- Findings: none");
    } else {
      for (const finding of decision.findings) {
        lines.push(`- ${finding.code}: ${finding.message} Remediation: ${finding.remediation}`);
      }
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

export function buildSummarySvg(result) {
  const width = 960;
  const height = 540;
  const approved = result.summary.approve;
  const held = result.summary.hold;
  const rejected = result.summary.reject;
  const total = Math.max(1, approved + held + rejected);
  const barWidth = 680;
  const approveWidth = Math.round((approved / total) * barWidth);
  const holdWidth = Math.round((held / total) * barWidth);
  const rejectWidth = barWidth - approveWidth - holdWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Credit role evidence consistency guard summary">
  <rect width="960" height="540" fill="#101820"/>
  <text x="60" y="76" fill="#f8fafc" font-family="Arial, sans-serif" font-size="32" font-weight="700">Credit Role Evidence Guard</text>
  <text x="60" y="114" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="17">CRediT claims are checked before reputation and profile publication.</text>
  <rect x="60" y="162" width="${approveWidth}" height="54" fill="#22c55e"/>
  <rect x="${60 + approveWidth}" y="162" width="${holdWidth}" height="54" fill="#f59e0b"/>
  <rect x="${60 + approveWidth + holdWidth}" y="162" width="${rejectWidth}" height="54" fill="#ef4444"/>
  <text x="60" y="256" fill="#f8fafc" font-family="Arial, sans-serif" font-size="24">Approved: ${approved}</text>
  <text x="60" y="304" fill="#f8fafc" font-family="Arial, sans-serif" font-size="24">Steward review: ${held}</text>
  <text x="60" y="352" fill="#f8fafc" font-family="Arial, sans-serif" font-size="24">Rejected: ${rejected}</text>
  <text x="60" y="416" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="18">Findings: ${result.summary.totalFindings} | Aggregate risk score: ${result.summary.riskScore}</text>
  <text x="60" y="464" fill="#94a3b8" font-family="Arial, sans-serif" font-size="15">Synthetic sample data only. No external APIs, private profiles, credentials, or live users.</text>
</svg>
`;
}
