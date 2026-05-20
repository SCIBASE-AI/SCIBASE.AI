"use strict";

const crypto = require("crypto");

const DEFAULT_POLICY = Object.freeze({
  asOf: "2026-05-20",
  maxOrcidSyncAgeDays: 30,
  maxReputationMetricAgeDays: 14,
  minReproducibilityScore: 0.7,
  requireVerifiedPrimaryAffiliation: true,
  requireGrantEvidenceForFundedProfiles: true,
  allowedProfileModes: ["public", "private", "anonymous_review"],
});

function evaluateResearcherProfiles(input, policyOverrides = {}) {
  const policy = { ...DEFAULT_POLICY, ...policyOverrides };
  const evaluations = [];

  for (const profile of input.profiles || []) {
    const findings = [];
    const profileMode = profile.profileMode || "private";
    const affiliations = Array.isArray(profile.affiliations) ? profile.affiliations : [];
    const grants = Array.isArray(profile.grants) ? profile.grants : [];
    const activity = Array.isArray(profile.activityFeed) ? profile.activityFeed : [];
    const reputation = profile.reputationMetrics || {};

    if (!profile.userId) {
      findings.push(blocker("missing_user_id", "Researcher profile requires a user id"));
    }

    if (!policy.allowedProfileModes.includes(profileMode)) {
      findings.push(blocker("invalid_profile_mode", `${profileMode} is not an allowed profile mode`));
    }

    if (profileMode === "public") {
      if (!profile.displayName) findings.push(hold("missing_public_display_name", "Public profile needs a display name"));
      if (!profile.field) findings.push(hold("missing_research_field", "Public profile needs a research field"));
    }

    evaluateIdentity(profile, policy, findings);
    evaluateAffiliations(affiliations, policy, findings);
    evaluateGrants(grants, profile, policy, findings);
    const activitySummary = evaluateActivityFeed(activity, profileMode, findings);
    const reputationSummary = evaluateReputation(reputation, policy, findings);

    if (profileMode === "anonymous_review") {
      if (!profile.anonymousReviewEscrowId) {
        findings.push(hold("missing_anonymous_review_escrow", "Anonymous review profile needs escrowed identity evidence"));
      }
      if (profile.displayName && !profile.displayName.includes("Anonymous")) {
        findings.push(hold("anonymous_mode_public_name", "Anonymous review mode should not expose the researcher name"));
      }
    }

    const status = evaluationStatus(findings);
    const evaluation = {
      userId: profile.userId || null,
      profileMode,
      status,
      displayName: profileMode === "anonymous_review" ? null : profile.displayName || null,
      field: profile.field || null,
      affiliationCount: affiliations.length,
      verifiedAffiliationCount: affiliations.filter((affiliation) => affiliation.verified).length,
      grantCount: grants.length,
      activitySummary,
      reputationSummary,
      findings: dedupeFindings(findings),
      recommendedActions: recommendedActions(status, findings),
    };

    evaluation.auditDigest = digest(evaluation);
    evaluations.push(evaluation);
  }

  const report = {
    asOf: policy.asOf,
    policy,
    profileCount: evaluations.length,
    totals: summarize(evaluations),
    evaluations,
  };

  return {
    ...report,
    auditDigest: digest(report),
  };
}

function evaluateIdentity(profile, policy, findings) {
  if (!profile.emailVerified) {
    findings.push(hold("email_not_verified", "Email must be verified before profile reputation is promoted"));
  }

  if (!profile.orcidId) {
    findings.push(hold("missing_orcid", "ORCID sync is required for publication and affiliation attribution"));
    return;
  }

  if (!/^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/.test(profile.orcidId)) {
    findings.push(blocker("invalid_orcid_format", "ORCID id must use the canonical 0000-0000-0000-0000 format"));
  }

  if (!profile.orcidLastSyncedAt) {
    findings.push(hold("missing_orcid_sync_timestamp", "ORCID profile needs a last sync timestamp"));
    return;
  }

  const syncAge = daysBetween(profile.orcidLastSyncedAt, policy.asOf);
  if (syncAge > policy.maxOrcidSyncAgeDays) {
    findings.push(hold("stale_orcid_sync", `ORCID sync is ${syncAge} days old; max is ${policy.maxOrcidSyncAgeDays}`));
  }
}

function evaluateAffiliations(affiliations, policy, findings) {
  if (!policy.requireVerifiedPrimaryAffiliation) return;
  const primary = affiliations.find((affiliation) => affiliation.primary);
  if (!primary) {
    findings.push(hold("missing_primary_affiliation", "Researcher profile needs a primary affiliation"));
    return;
  }
  if (!primary.verified || !primary.verifiedAt) {
    findings.push(hold("unverified_primary_affiliation", "Primary affiliation must be verified"));
  }
  if (!primary.institution) {
    findings.push(blocker("missing_affiliation_institution", "Primary affiliation needs an institution name"));
  }
}

function evaluateGrants(grants, profile, policy, findings) {
  if (!profile.fundedResearcher && grants.length === 0) return;
  if (policy.requireGrantEvidenceForFundedProfiles && grants.length === 0) {
    findings.push(hold("missing_grant_evidence", "Funded researcher profile needs grant evidence"));
  }

  for (const grant of grants) {
    if (!grant.grantId || !grant.funder) {
      findings.push(hold("incomplete_grant_record", "Grant records need grantId and funder"));
    }
    if (!grant.verified) {
      findings.push(hold("unverified_grant", `${grant.grantId || "grant"} needs verification evidence`));
    }
  }
}

function evaluateActivityFeed(activity, profileMode, findings) {
  const summary = {
    itemCount: activity.length,
    publicItems: 0,
    privateItems: 0,
    leakedPrivateItems: 0,
  };

  for (const item of activity) {
    if (item.visibility === "public") summary.publicItems += 1;
    if (item.visibility === "private") summary.privateItems += 1;

    if (item.visibility === "public" && item.projectVisibility === "private") {
      summary.leakedPrivateItems += 1;
      findings.push(hold("private_project_activity_leak", `${item.id || "activity"} exposes private project activity`));
    }

    if (profileMode === "private" && item.visibility === "public" && item.kind !== "publication") {
      findings.push(hold("private_profile_activity_visibility", `${item.id || "activity"} is public on a private profile`));
    }

    if (profileMode === "anonymous_review" && item.identityHint) {
      findings.push(hold("anonymous_activity_identity_hint", `${item.id || "activity"} contains an identity hint`));
    }
  }

  return summary;
}

function evaluateReputation(reputation, policy, findings) {
  const summary = {
    citationCount: assertMetric(reputation.citationCount || 0, "citationCount"),
    downloadCount: assertMetric(reputation.downloadCount || 0, "downloadCount"),
    forkCount: assertMetric(reputation.forkCount || 0, "forkCount"),
    endorsementCount: assertMetric(reputation.endorsementCount || 0, "endorsementCount"),
    reproducibilityScore: reputation.reproducibilityScore === undefined ? null : reputation.reproducibilityScore,
  };

  if (summary.reproducibilityScore !== null) {
    if (typeof summary.reproducibilityScore !== "number" || summary.reproducibilityScore < 0 || summary.reproducibilityScore > 1) {
      findings.push(blocker("invalid_reproducibility_score", "Reproducibility score must be between 0 and 1"));
    } else if (summary.reproducibilityScore < policy.minReproducibilityScore) {
      findings.push(
        hold(
          "low_reproducibility_score",
          `Reproducibility score ${summary.reproducibilityScore} is below ${policy.minReproducibilityScore}`
        )
      );
    }
  } else {
    findings.push(hold("missing_reproducibility_score", "Profile needs a reproducibility score"));
  }

  if (!reputation.lastComputedAt) {
    findings.push(hold("missing_reputation_timestamp", "Reputation metrics need a computation timestamp"));
  } else {
    const metricAge = daysBetween(reputation.lastComputedAt, policy.asOf);
    if (metricAge > policy.maxReputationMetricAgeDays) {
      findings.push(
        hold(
          "stale_reputation_metrics",
          `Reputation metrics are ${metricAge} days old; max is ${policy.maxReputationMetricAgeDays}`
        )
      );
    }
  }

  return summary;
}

function assertMetric(value, field) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative integer`);
  }
  return value;
}

function summarize(evaluations) {
  return evaluations.reduce(
    (totals, evaluation) => {
      if (evaluation.status === "ready") totals.readyCount += 1;
      if (evaluation.status === "held") totals.heldCount += 1;
      if (evaluation.status === "blocked") totals.blockedCount += 1;
      totals.affiliations += evaluation.affiliationCount;
      totals.grants += evaluation.grantCount;
      totals.activityItems += evaluation.activitySummary.itemCount;
      return totals;
    },
    { readyCount: 0, heldCount: 0, blockedCount: 0, affiliations: 0, grants: 0, activityItems: 0 }
  );
}

function recommendedActions(status, findings) {
  if (status === "ready") {
    return ["Publish profile reputation refresh", "Archive profile audit digest"];
  }

  const actions = new Set();
  for (const finding of findings) {
    if (finding.code === "missing_user_id") actions.add("Attach stable user id");
    if (finding.code === "invalid_profile_mode") actions.add("Select public, private, or anonymous review profile mode");
    if (finding.code === "email_not_verified") actions.add("Verify email before reputation promotion");
    if (finding.code === "missing_orcid") actions.add("Connect ORCID account");
    if (finding.code === "invalid_orcid_format") actions.add("Normalize ORCID id format");
    if (finding.code === "stale_orcid_sync") actions.add("Refresh ORCID publication and affiliation sync");
    if (finding.code === "missing_primary_affiliation") actions.add("Add primary affiliation");
    if (finding.code === "unverified_primary_affiliation") actions.add("Verify primary institution affiliation");
    if (finding.code === "missing_grant_evidence") actions.add("Attach grant evidence for funded profile");
    if (finding.code === "unverified_grant") actions.add("Verify grant evidence");
    if (finding.code === "private_project_activity_leak") actions.add("Redact private project activity from public feed");
    if (finding.code === "anonymous_activity_identity_hint") actions.add("Remove identity hints from anonymous review activity");
    if (finding.code === "low_reproducibility_score") actions.add("Hold reputation promotion until reproducibility score improves");
    if (finding.code === "stale_reputation_metrics") actions.add("Recompute citation, fork, download, and reproducibility metrics");
  }
  return Array.from(actions);
}

function evaluationStatus(findings) {
  if (findings.some((finding) => finding.severity === "blocker")) return "blocked";
  if (findings.some((finding) => finding.severity === "hold")) return "held";
  return "ready";
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
  evaluateResearcherProfiles,
};
