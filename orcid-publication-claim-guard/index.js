const crypto = require("crypto");

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeDoi(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, "");
}

function tokenSet(value) {
  return new Set(normalizeText(value).split(" ").filter(Boolean));
}

function overlapScore(left, right) {
  const a = tokenSet(left);
  const b = tokenSet(right);
  if (a.size === 0 || b.size === 0) return 0;

  let overlap = 0;
  for (const token of a) {
    if (b.has(token)) overlap += 1;
  }
  return overlap / Math.max(a.size, b.size);
}

function nameMatches(researcher, author) {
  const names = [researcher.displayName, ...(researcher.aliases || [])];
  return names.some((name) => overlapScore(name, author.name) >= 0.8);
}

function affiliationMatches(researcher, affiliation) {
  return (researcher.affiliations || []).some(
    (item) => overlapScore(item, affiliation) >= 0.55
  );
}

function coauthorMatches(researcher, publication) {
  const known = new Set(
    (researcher.knownCoauthors || []).map((name) => normalizeText(name))
  );
  return (publication.authors || [])
    .map((author) => normalizeText(author.name))
    .filter((name) => known.has(name));
}

function findResearcherAuthor(researcher, publication) {
  return (publication.authors || []).find((author) => {
    if (author.orcid && researcher.orcid && author.orcid === researcher.orcid) {
      return true;
    }
    return nameMatches(researcher, author);
  });
}

function findConflictingOwner(researcher, publication, existingClaims) {
  const doi = normalizeDoi(publication.doi);
  return existingClaims.find(
    (claim) =>
      normalizeDoi(claim.doi) === doi && claim.researcherId !== researcher.id
  );
}

function scorePublicationClaim(researcher, publication, existingClaims = []) {
  const evidence = [];
  const blockers = [];
  const actions = [];
  let score = 0;

  const matchedAuthor = findResearcherAuthor(researcher, publication);
  const conflictingOwner = findConflictingOwner(
    researcher,
    publication,
    existingClaims
  );

  if (conflictingOwner) {
    blockers.push(
      `DOI already claimed by ${conflictingOwner.researcherId}: ${conflictingOwner.doi}`
    );
    actions.push("quarantine duplicate DOI until the existing owner is reviewed");
  }

  if (publication.status && publication.status !== "published") {
    blockers.push(`publication status is ${publication.status}`);
    actions.push("hold non-published or retracted work out of profile metrics");
  }

  if (!matchedAuthor) {
    blockers.push("no author row matches the researcher name or ORCID");
    actions.push("request manual attribution evidence before profile attach");
  } else {
    if (matchedAuthor.orcid === researcher.orcid) {
      score += 45;
      evidence.push("exact ORCID match on an author row");
    } else if (matchedAuthor.orcid && matchedAuthor.orcid !== researcher.orcid) {
      blockers.push(
        `matching name has different ORCID ${matchedAuthor.orcid}`
      );
      actions.push("treat as homonym until the alternate ORCID is reconciled");
    } else {
      score += 18;
      evidence.push("normalized author name matches profile name or alias");
    }

    if (affiliationMatches(researcher, matchedAuthor.affiliation)) {
      score += 18;
      evidence.push("author affiliation matches researcher profile");
    } else if (matchedAuthor.affiliation) {
      blockers.push(
        `author affiliation '${matchedAuthor.affiliation}' is not in profile`
      );
      actions.push("ask researcher to confirm affiliation at publication time");
    }
  }

  const coauthors = coauthorMatches(researcher, publication);
  if (coauthors.length > 0) {
    score += Math.min(18, coauthors.length * 9);
    evidence.push(`known coauthor overlap: ${coauthors.join(", ")}`);
  }

  if (
    publication.year < researcher.profileWindow.start ||
    publication.year > researcher.profileWindow.end
  ) {
    blockers.push(`publication year ${publication.year} is outside profile window`);
    actions.push("verify historic affiliation before attaching");
  } else {
    score += 8;
    evidence.push("publication year falls inside profile window");
  }

  if (publication.doi) {
    score += 6;
    evidence.push(`normalized DOI: ${normalizeDoi(publication.doi)}`);
  }

  let decision = "review";
  if (blockers.length > 0) {
    decision = "quarantine";
  } else if (score >= 72) {
    decision = "auto_accept";
    actions.push("attach to profile and include in reputation metrics");
  } else {
    actions.push("hold for reviewer approval before affecting metrics");
  }

  const result = {
    researcherId: researcher.id,
    publicationId: publication.id,
    title: publication.title,
    doi: normalizeDoi(publication.doi),
    decision,
    score,
    evidence,
    blockers,
    actions: [...new Set(actions)],
  };

  return {
    ...result,
    auditDigest: digestResult(result),
  };
}

function digestResult(result) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(result))
    .digest("hex");
}

function evaluatePublicationClaims({
  researcher,
  publications,
  existingClaims = [],
}) {
  const decisions = publications.map((publication) =>
    scorePublicationClaim(researcher, publication, existingClaims)
  );
  const summary = decisions.reduce(
    (acc, decision) => {
      acc.total += 1;
      acc[decision.decision] += 1;
      return acc;
    },
    { total: 0, auto_accept: 0, review: 0, quarantine: 0 }
  );

  return {
    generatedAt: new Date().toISOString(),
    researcher: {
      id: researcher.id,
      displayName: researcher.displayName,
      orcid: researcher.orcid,
    },
    summary,
    decisions,
  };
}

function renderMarkdownReport(report) {
  const lines = [
    "# ORCID Publication Claim Guard Report",
    "",
    `Researcher: ${report.researcher.displayName} (${report.researcher.orcid})`,
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Total imports checked: ${report.summary.total}`,
    `- Auto accepted: ${report.summary.auto_accept}`,
    `- Needs review: ${report.summary.review}`,
    `- Quarantined: ${report.summary.quarantine}`,
    "",
    "## Decisions",
    "",
  ];

  for (const item of report.decisions) {
    lines.push(`### ${item.publicationId} - ${item.decision}`);
    lines.push("");
    lines.push(`- Title: ${item.title}`);
    lines.push(`- DOI: ${item.doi}`);
    lines.push(`- Score: ${item.score}`);
    lines.push(`- Audit digest: ${item.auditDigest}`);
    lines.push(`- Evidence: ${item.evidence.join("; ") || "none"}`);
    lines.push(`- Blockers: ${item.blockers.join("; ") || "none"}`);
    lines.push(`- Actions: ${item.actions.join("; ")}`);
    lines.push("");
  }

  return lines.join("\n");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSvgReport(report) {
  const rows = report.decisions
    .map((item, index) => {
      const y = 190 + index * 86;
      const color =
        item.decision === "auto_accept"
          ? "#059669"
          : item.decision === "review"
            ? "#d97706"
            : "#dc2626";
      return `
        <g transform="translate(60 ${y})">
          <rect width="1080" height="62" rx="10" fill="#f8fafc" stroke="#cbd5e1"/>
          <circle cx="28" cy="31" r="10" fill="${color}"/>
          <text x="54" y="25" font-size="20" font-weight="700">${escapeXml(item.publicationId)} - ${escapeXml(item.decision)}</text>
          <text x="54" y="49" font-size="15" fill="#475569">${escapeXml(item.title.slice(0, 104))}</text>
          <text x="850" y="38" font-size="18" font-weight="700" fill="${color}">score ${item.score}</text>
        </g>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
  <rect width="1200" height="720" fill="#eef2ff"/>
  <rect x="34" y="34" width="1132" height="652" rx="18" fill="white" stroke="#c7d2fe"/>
  <text x="60" y="92" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#111827">ORCID Publication Claim Guard</text>
  <text x="60" y="130" font-family="Arial, sans-serif" font-size="20" fill="#475569">${escapeXml(report.researcher.displayName)} - ${escapeXml(report.researcher.orcid)}</text>
  <text x="60" y="160" font-family="Arial, sans-serif" font-size="18" fill="#64748b">Accepted ${report.summary.auto_accept} / Review ${report.summary.review} / Quarantine ${report.summary.quarantine}</text>
  <g font-family="Arial, sans-serif">${rows}</g>
</svg>`;
}

module.exports = {
  evaluatePublicationClaims,
  normalizeDoi,
  normalizeText,
  renderMarkdownReport,
  renderSvgReport,
  scorePublicationClaim,
};
