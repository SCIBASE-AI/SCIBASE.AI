const crypto = require("crypto");

const SEVERITY_WEIGHT = {
  blocker: 32,
  high: 18,
  medium: 9,
  low: 4,
};

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
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
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 16);
}

function daysBetween(start, end) {
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  return Math.floor((endDate.getTime() - startDate.getTime()) / 86400000);
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function levenshtein(a, b) {
  const left = normalize(a);
  const right = normalize(b);
  const matrix = Array.from({ length: left.length + 1 }, (_, row) => [row]);
  for (let column = 1; column <= right.length; column += 1) {
    matrix[0][column] = column;
  }
  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      );
    }
  }
  return matrix[left.length][right.length];
}

function finding(severity, code, title, evidence, action) {
  return { severity, code, title, evidence, action };
}

function reviewIdentifierClaims(profile, context) {
  const findings = [];
  const reviewDate = context.reviewDate;
  const maxFreshDays = context.maxVerificationAgeDays || 365;

  (profile.claimedIdentifiers || []).forEach((identifier) => {
    const label = `${identifier.type}:${identifier.value}`;
    if (identifier.status !== "verified") {
      findings.push(finding(
        "high",
        "UNVERIFIED_IDENTIFIER",
        "External identifier is not verified",
        `${label} is marked ${identifier.status || "unknown"} for profile ${profile.id}.`,
        "Hold reputation-bearing actions until the identifier is verified through an approved channel.",
      ));
    }

    if (identifier.verifiedAt && daysBetween(identifier.verifiedAt, reviewDate) > maxFreshDays) {
      findings.push(finding(
        "medium",
        "STALE_IDENTIFIER_VERIFICATION",
        "External identifier verification is stale",
        `${label} was last verified ${daysBetween(identifier.verifiedAt, reviewDate)} days before review.`,
        "Refresh the ORCID, institutional, or external-profile verification before publishing profile trust signals.",
      ));
    }

    if ((identifier.existingProfileIds || []).length) {
      findings.push(finding(
        "blocker",
        "DUPLICATE_IDENTIFIER_CLAIM",
        "Identifier is already bound to another profile",
        `${label} is already claimed by ${identifier.existingProfileIds.join(", ")}.`,
        "Block trust updates and open an identity-resolution case before endorsements or badges are applied.",
      ));
    }
  });

  return findings;
}

function reviewAffiliation(profile, context) {
  const findings = [];
  const allowedDomains = new Set((context.institutionDomains[profile.institutionId] || []).map(normalize));
  const emailDomain = normalize(profile.emailDomain);
  if (profile.institutionId && emailDomain && allowedDomains.size && !allowedDomains.has(emailDomain)) {
    findings.push(finding(
      "high",
      "AFFILIATION_DOMAIN_MISMATCH",
      "Institutional affiliation does not match verified email domain",
      `${profile.displayName} claims ${profile.institutionName}, but email domain ${emailDomain} is outside ${Array.from(allowedDomains).join(", ")}.`,
      "Require fresh affiliation proof or show the affiliation as unverified before profile exports or reputation changes.",
    ));
  }

  if (profile.affiliationVerifiedAt && daysBetween(profile.affiliationVerifiedAt, context.reviewDate) > 365) {
    findings.push(finding(
      "medium",
      "STALE_AFFILIATION_VERIFICATION",
      "Affiliation verification is stale",
      `Affiliation was last verified ${daysBetween(profile.affiliationVerifiedAt, context.reviewDate)} days before review.`,
      "Refresh affiliation evidence before using the institution in leaderboards or citation pages.",
    ));
  }

  return findings;
}

function reviewNameAndHandleCollisions(profile, context) {
  const findings = [];
  const reservedNames = new Set((context.reservedResearcherNames || []).map(normalize));
  if (reservedNames.has(normalize(profile.displayName)) && !profile.reservedNameApproval) {
    findings.push(finding(
      "high",
      "RESERVED_NAME_COLLISION",
      "Profile uses a reserved or high-trust researcher display name",
      `${profile.displayName} matches a reserved researcher name without an approval record.`,
      "Hold public trust badges and route the profile through manual identity review.",
    ));
  }

  (context.trustedProfiles || []).forEach((trusted) => {
    const distance = levenshtein(profile.handle, trusted.handle);
    if (trusted.id !== profile.id && distance > 0 && distance <= 2) {
      findings.push(finding(
        "high",
        "LOOKALIKE_HANDLE_COLLISION",
        "Profile handle is visually close to a trusted researcher profile",
        `${profile.handle} is distance ${distance} from trusted handle ${trusted.handle}.`,
        "Hold endorsements and require reviewer confirmation that the profile is not impersonating the trusted account.",
      ));
    }
  });

  (profile.nameCollisions || []).forEach((collision) => {
    if (collision.similarity >= 0.92) {
      findings.push(finding(
        "medium",
        "DISPLAY_NAME_AMBIGUITY",
        "Display name is ambiguous with an existing researcher profile",
        `${profile.displayName} has ${Math.round(collision.similarity * 100)}% similarity with ${collision.profileId}.`,
        "Render an ambiguity warning and require stronger verified identifiers before reputation deltas are shown.",
      ));
    }
  });

  return findings;
}

function reviewRecentProfileChanges(profile, context) {
  const findings = [];
  const trustWindowDays = context.profileChangeTrustWindowDays || 14;
  const hasPendingTrustEvent = (profile.pendingTrustEvents || []).some((event) => event.reputationImpact !== "none");

  (profile.recentChanges || []).forEach((change) => {
    const ageDays = daysBetween(change.changedAt, context.reviewDate);
    if (ageDays <= trustWindowDays && hasPendingTrustEvent && ["handle", "displayName", "institution"].includes(change.field)) {
      findings.push(finding(
        "medium",
        "RECENT_PROFILE_REBRAND_NEAR_TRUST_EVENT",
        "Profile identity fields changed shortly before a reputation-bearing event",
        `${change.field} changed from ${change.from} to ${change.to} ${ageDays} days before review.`,
        "Freeze the affected reputation event until the changed identity field is acknowledged in the audit trail.",
      ));
    }
  });

  return findings;
}

function reviewAnonymousSafety(profile) {
  const findings = [];
  (profile.pendingTrustEvents || []).forEach((event) => {
    if ((event.reviewMode === "anonymous" || event.reviewMode === "double-blind") && event.linksProfileIdentity) {
      findings.push(finding(
        "blocker",
        "ANONYMOUS_REVIEW_IDENTITY_LINKAGE",
        "Trust event would reveal an anonymous or double-blind reviewer identity",
        `${event.id} links profile identity into a ${event.reviewMode} review context.`,
        "Block the public profile update and issue an anonymous-review-safe receipt instead.",
      ));
    }
  });
  return findings;
}

function reviewExternalProfiles(profile, context) {
  const findings = [];
  const minimumConfidence = context.minimumExternalProfileConfidence || 0.8;
  (profile.externalProfiles || []).forEach((external) => {
    if (!external.proof || external.confidence < minimumConfidence) {
      findings.push(finding(
        "medium",
        "WEAK_EXTERNAL_PROFILE_EVIDENCE",
        "External profile evidence is weak",
        `${external.platform} confidence is ${external.confidence} with proof ${external.proof || "missing"}.`,
        "Show the external profile as unverified and exclude it from reputation calculations.",
      ));
    }
  });
  return findings;
}

function evaluateIdentityTrust(profile, context) {
  const findings = [
    ...reviewIdentifierClaims(profile, context),
    ...reviewAffiliation(profile, context),
    ...reviewNameAndHandleCollisions(profile, context),
    ...reviewRecentProfileChanges(profile, context),
    ...reviewAnonymousSafety(profile),
    ...reviewExternalProfiles(profile, context),
  ];

  const riskScore = Math.min(100, findings.reduce((sum, item) => sum + SEVERITY_WEIGHT[item.severity], 0));
  const blockers = findings.filter((item) => item.severity === "blocker").length;
  const high = findings.filter((item) => item.severity === "high").length;
  const decision = blockers
    ? "hold-profile-trust"
    : high
      ? "manual-identity-review"
      : findings.length
        ? "publish-with-verification-warnings"
        : "safe-to-trust";

  const heldEvents = (profile.pendingTrustEvents || [])
    .filter((event) => decision !== "safe-to-trust" && event.reputationImpact !== "none")
    .map((event) => ({
      id: event.id,
      type: event.type,
      action: decision === "hold-profile-trust" ? "block" : "hold-for-review",
    }));

  const packet = {
    profileId: profile.id,
    displayName: profile.displayName,
    handle: profile.handle,
    reviewedAt: context.reviewDate,
    decision,
    riskScore,
    findings,
    heldEvents,
    remediationActions: findings.map((item) => ({ code: item.code, action: item.action })),
    generatedFrom: "synthetic-data-only",
  };

  return {
    ...packet,
    auditDigest: digest(packet),
  };
}

function renderMarkdownReport(result) {
  const lines = [
    "# Researcher Identity Impersonation Review",
    "",
    `Profile: ${result.displayName} (${result.handle})`,
    `Decision: ${result.decision}`,
    `Risk score: ${result.riskScore}`,
    `Held events: ${result.heldEvents.length}`,
    `Audit digest: ${result.auditDigest}`,
    "",
    "## Findings",
  ];
  if (!result.findings.length) {
    lines.push("- No identity-impersonation or external-identifier risks detected.");
  } else {
    result.findings.forEach((item) => {
      lines.push(`- [${item.severity}] ${item.title}: ${item.evidence}`);
      lines.push(`  Action: ${item.action}`);
    });
  }
  lines.push("", "## Safety", "- Synthetic profile packets only; no credentials, private profiles, live ORCID, institutional directory, or external identity-provider calls.");
  return `${lines.join("\n")}\n`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSvgSummary(result) {
  const color = result.decision === "hold-profile-trust"
    ? "#b42318"
    : result.decision === "safe-to-trust"
      ? "#067647"
      : "#b54708";
  const rows = result.findings.slice(0, 5).map((item, index) => {
    const y = 188 + index * 36;
    return `<text x="32" y="${y}" font-family="Arial" font-size="18" fill="#344054">${escapeXml(item.code)} - ${escapeXml(item.severity)}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="420" viewBox="0 0 960 420" role="img" aria-label="Researcher identity impersonation review summary">
  <rect width="960" height="420" fill="#f8fafc"/>
  <rect x="24" y="24" width="912" height="372" rx="12" fill="#ffffff" stroke="#d0d5dd"/>
  <text x="32" y="70" font-family="Arial" font-size="28" font-weight="700" fill="#101828">Researcher Identity Impersonation Guard</text>
  <rect x="32" y="96" width="360" height="48" rx="6" fill="${color}"/>
  <text x="52" y="127" font-family="Arial" font-size="22" font-weight="700" fill="#ffffff">${escapeXml(result.decision)}</text>
  <text x="420" y="127" font-family="Arial" font-size="22" fill="#101828">Risk score: ${result.riskScore}</text>
  <text x="32" y="164" font-family="Arial" font-size="20" fill="#475467">Audit digest: ${escapeXml(result.auditDigest)}</text>
  ${rows}
  <text x="32" y="366" font-family="Arial" font-size="18" fill="#667085">Synthetic profile data only. No live identity provider calls.</text>
</svg>
`;
}

module.exports = {
  digest,
  evaluateIdentityTrust,
  renderMarkdownReport,
  renderSvgSummary,
  levenshtein,
};
