const HIGH = "high";
const MEDIUM = "medium";
const LOW = "low";

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function array(value, field) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${field} must be an array`);
  }
  return value;
}

function unique(values) {
  return [...new Set(values.map(String))];
}

function normalizeDate(value, field) {
  const text = requiredString(value, field);
  const time = Date.parse(text);
  if (Number.isNaN(time)) {
    throw new TypeError(`${field} must be an ISO date`);
  }
  return text;
}

function normalizeAffiliation(raw, index) {
  return {
    id: requiredString(raw.id, `affiliations[${index}].id`),
    institution: requiredString(raw.institution, `affiliations[${index}].institution`),
    role: requiredString(raw.role, `affiliations[${index}].role`),
    source: raw.source ? String(raw.source) : "",
    verifiedDomain: raw.verifiedDomain ? String(raw.verifiedDomain).toLowerCase() : "",
    validFrom: normalizeDate(raw.validFrom || "1970-01-01", `affiliations[${index}].validFrom`),
    validUntil: raw.validUntil ? normalizeDate(raw.validUntil, `affiliations[${index}].validUntil`) : "",
    publicClaim: Boolean(raw.publicClaim),
    evidenceRefs: unique(raw.evidenceRefs || []),
  };
}

function normalizeGrant(raw, index) {
  return {
    id: requiredString(raw.id, `grants[${index}].id`),
    funder: requiredString(raw.funder, `grants[${index}].funder`),
    projectId: requiredString(raw.projectId, `grants[${index}].projectId`),
    publicClaim: Boolean(raw.publicClaim),
    consent: raw.consent ? String(raw.consent) : "",
    evidenceRefs: unique(raw.evidenceRefs || []),
  };
}

function normalizeProfile(raw) {
  return {
    researcherId: requiredString(raw.researcherId, "researcherId"),
    displayName: requiredString(raw.displayName, "displayName"),
    profileMode: requiredString(raw.profileMode || "private", "profileMode"),
    orcid: raw.orcid ? String(raw.orcid) : "",
    verifiedEmails: unique(raw.verifiedEmails || []).map((item) => item.toLowerCase()),
    affiliations: array(raw.affiliations || [], "affiliations").map(normalizeAffiliation),
    grants: array(raw.grants || [], "grants").map(normalizeGrant),
    trustInputs: {
      useAffiliationsForInvites: Boolean(raw.trustInputs && raw.trustInputs.useAffiliationsForInvites),
      useGrantsForReputation: Boolean(raw.trustInputs && raw.trustInputs.useGrantsForReputation),
      publicReputationBadge: Boolean(raw.trustInputs && raw.trustInputs.publicReputationBadge),
    },
  };
}

function finding(code, severity, sourceId, message, remediation) {
  return { code, severity, sourceId, message, remediation };
}

function emailDomains(emails) {
  return unique(emails.map((email) => email.split("@")[1]).filter(Boolean));
}

function isExpired(dateText, asOf) {
  return dateText && Date.parse(dateText) < Date.parse(asOf);
}

function assessAffiliationAttestation(rawProfile, options = {}) {
  const profile = normalizeProfile(rawProfile);
  const asOf = normalizeDate(options.asOf || "2026-06-01", "asOf");
  const findings = [];
  const domains = emailDomains(profile.verifiedEmails);
  const publicAffiliations = profile.affiliations.filter((item) => item.publicClaim);
  const publicGrants = profile.grants.filter((item) => item.publicClaim);

  if (profile.profileMode === "public" && !profile.orcid) {
    findings.push(
      finding(
        "PUBLIC_PROFILE_WITHOUT_ORCID",
        MEDIUM,
        profile.researcherId,
        `${profile.displayName} has a public profile without an ORCID identifier.`,
        "Link ORCID or keep profile credentials private until identity evidence is complete."
      )
    );
  }

  for (const affiliation of publicAffiliations) {
    if (!["orcid", "institutional-sso", "admin-attestation"].includes(affiliation.source)) {
      findings.push(
        finding(
          "UNTRUSTED_AFFILIATION_SOURCE",
          HIGH,
          affiliation.id,
          `${affiliation.institution} affiliation uses untrusted source ${affiliation.source || "none"}.`,
          "Require ORCID, institutional SSO, or admin attestation before publishing affiliation claims."
        )
      );
    }

    if (isExpired(affiliation.validUntil, asOf)) {
      findings.push(
        finding(
          "EXPIRED_PUBLIC_AFFILIATION",
          HIGH,
          affiliation.id,
          `${affiliation.institution} affiliation expired on ${affiliation.validUntil}.`,
          "Hide or refresh expired appointments before they influence invitations, grants, or reputation."
        )
      );
    }

    if (affiliation.verifiedDomain && !domains.includes(affiliation.verifiedDomain)) {
      findings.push(
        finding(
          "AFFILIATION_DOMAIN_MISMATCH",
          HIGH,
          affiliation.id,
          `${affiliation.institution} requires ${affiliation.verifiedDomain}, but no verified email matches that domain.`,
          "Verify an institutional email domain or remove the public affiliation claim."
        )
      );
    }

    if (affiliation.evidenceRefs.length === 0) {
      findings.push(
        finding(
          "AFFILIATION_WITHOUT_EVIDENCE",
          MEDIUM,
          affiliation.id,
          `${affiliation.institution} public affiliation lacks evidence references.`,
          "Attach ORCID records, SSO assertions, appointment receipts, or admin attestations."
        )
      );
    }
  }

  const activeInstitutions = publicAffiliations
    .filter((item) => !isExpired(item.validUntil, asOf))
    .map((item) => item.institution);
  if (unique(activeInstitutions).length > 1) {
    findings.push(
      finding(
        "MULTIPLE_ACTIVE_PUBLIC_INSTITUTIONS",
        MEDIUM,
        "affiliations",
        `Profile has multiple active public institutions: ${unique(activeInstitutions).join(", ")}.`,
        "Require primary affiliation selection and conflict disclosure before institutional trust is applied."
      )
    );
  }

  for (const grant of publicGrants) {
    if (grant.consent !== "public") {
      findings.push(
        finding(
          "GRANT_WITHOUT_PUBLIC_CONSENT",
          HIGH,
          grant.id,
          `${grant.funder} grant is public but consent is ${grant.consent || "missing"}.`,
          "Collect funder/PI consent before exposing grant claims or using them in reputation scoring."
        )
      );
    }

    if (grant.evidenceRefs.length === 0) {
      findings.push(
        finding(
          "GRANT_WITHOUT_EVIDENCE",
          MEDIUM,
          grant.id,
          `${grant.funder} grant lacks evidence references.`,
          "Attach award IDs, public grant pages, or institutional award receipts."
        )
      );
    }
  }

  if (profile.trustInputs.useAffiliationsForInvites && findings.some((item) => item.code.includes("AFFILIATION"))) {
    findings.push(
      finding(
        "UNVERIFIED_AFFILIATION_USED_FOR_INVITES",
        HIGH,
        "trustInputs.useAffiliationsForInvites",
        "Affiliation claims have blockers but are enabled for project invitation trust.",
        "Disable affiliation-derived invitations until all public affiliation findings are resolved."
      )
    );
  }

  if (profile.trustInputs.useGrantsForReputation && findings.some((item) => item.code.includes("GRANT"))) {
    findings.push(
      finding(
        "UNVERIFIED_GRANT_USED_FOR_REPUTATION",
        HIGH,
        "trustInputs.useGrantsForReputation",
        "Grant claims have blockers but are enabled for reputation scoring.",
        "Disable grant-derived reputation inputs until grant consent and evidence are verified."
      )
    );
  }

  if (profile.trustInputs.publicReputationBadge && profile.profileMode !== "public") {
    findings.push(
      finding(
        "REPUTATION_BADGE_ON_PRIVATE_PROFILE",
        LOW,
        "trustInputs.publicReputationBadge",
        "A public reputation badge is enabled while the profile is private.",
        "Align badge visibility with the profile mode or provide explicit public-badge consent."
      )
    );
  }

  const high = findings.filter((item) => item.severity === HIGH).length;
  const medium = findings.filter((item) => item.severity === MEDIUM).length;
  return {
    researcherId: profile.researcherId,
    displayName: profile.displayName,
    profileMode: profile.profileMode,
    decision: high > 0 ? "hold" : medium > 0 ? "revise" : "release",
    summary: {
      affiliationsReviewed: profile.affiliations.length,
      publicAffiliations: publicAffiliations.length,
      grantsReviewed: profile.grants.length,
      publicGrants: publicGrants.length,
      findings: findings.length,
      high,
      medium,
      low: findings.filter((item) => item.severity === LOW).length,
    },
    findings,
    releaseCriteria: [
      "Public affiliations come from ORCID, institutional SSO, or admin attestation.",
      "Expired appointments are hidden or refreshed before trust decisions.",
      "Verified email domains match claimed institutional affiliations.",
      "Public grant claims have consent and evidence references.",
      "Unverified affiliations and grants do not feed invitations, trust, or reputation scoring.",
    ],
  };
}

module.exports = {
  assessAffiliationAttestation,
  normalizeProfile,
};
