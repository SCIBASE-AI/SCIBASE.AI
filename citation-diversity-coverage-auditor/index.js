"use strict";

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function flatten(items, key) {
  return items.flatMap((item) => item[key] || []);
}

function ratio(numerator, denominator) {
  if (!denominator) return 1;
  return numerator / denominator;
}

function countBy(items, getKey) {
  return items.reduce((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function topShare(items, getKey) {
  if (!items.length) return 0;
  const counts = Object.values(countBy(items, getKey));
  return Math.max(...counts) / items.length;
}

function intersect(left, right) {
  const lookup = new Set(right || []);
  return (left || []).filter((value) => lookup.has(value));
}

function citationMatchesNeed(citation, need) {
  return (
    (citation.domains || []).includes(need) ||
    (citation.methods || []).includes(need) ||
    (citation.populations || []).includes(need) ||
    (citation.citedFor || []).includes(need)
  );
}

function claimCoverage(manuscript, citations) {
  return manuscript.claims.map((claim) => {
    const matches = citations.filter((citation) =>
      claim.needs.some((need) => citationMatchesNeed(citation, need)) ||
      (citation.citedFor || []).includes(claim.purpose)
    );
    const needCoverage = ratio(
      claim.needs.filter((need) => matches.some((citation) => citationMatchesNeed(citation, need))).length,
      claim.needs.length
    );
    return {
      claimId: claim.id,
      purpose: claim.purpose,
      coveredNeeds: claim.needs.filter((need) => matches.some((citation) => citationMatchesNeed(citation, need))),
      missingNeeds: claim.needs.filter((need) => !matches.some((citation) => citationMatchesNeed(citation, need))),
      supportingCitationIds: matches.map((citation) => citation.id),
      coverageScore: Number(needCoverage.toFixed(2))
    };
  });
}

function scoreCitation(citation, manuscriptYear) {
  let score = Math.round((citation.relevance || 0) * 45);
  if (citation.access === "open") score += 10;
  if (citation.influence === "seminal") score += 8;
  if (manuscriptYear - citation.year <= 5) score += 12;
  if ((citation.riskFlags || []).includes("retracted")) score -= 35;
  if ((citation.riskFlags || []).includes("expression-of-concern")) score -= 20;
  if ((citation.populations || []).includes("children")) score += 5;
  if ((citation.populations || []).includes("low-income-households")) score += 5;
  return Math.max(0, Math.min(100, score));
}

function buildFindings(metrics, coverage, citations) {
  const findings = [];
  if (metrics.coverageScore < 0.85) {
    findings.push({
      severity: "high",
      code: "claim-coverage-gap",
      message: "Some manuscript claims are missing enough method, population, or domain support.",
      evidence: coverage
        .filter((item) => item.missingNeeds.length)
        .map((item) => `${item.claimId}: ${item.missingNeeds.join(", ")}`),
      action: "Add citations that directly cover the missing needs before accepting the citation set."
    });
  }
  if (metrics.openAccessShare < 0.55) {
    findings.push({
      severity: "medium",
      code: "open-access-shortfall",
      message: "The recommended set is too dependent on closed-access papers.",
      evidence: [`openAccessShare=${metrics.openAccessShare}`],
      action: "Prefer an open-access replacement when relevance is comparable."
    });
  }
  if (metrics.topRegionShare > 0.65) {
    findings.push({
      severity: "medium",
      code: "regional-concentration",
      message: "Citation recommendations are concentrated in one region.",
      evidence: [`topRegionShare=${metrics.topRegionShare}`],
      action: "Add regionally diverse evidence if the manuscript makes broadly generalizable claims."
    });
  }
  if (metrics.topVenueShare > 0.45) {
    findings.push({
      severity: "low",
      code: "venue-concentration",
      message: "Many recommendations come from the same venue.",
      evidence: [`topVenueShare=${metrics.topVenueShare}`],
      action: "Review whether venue concentration reflects true relevance or retrieval bias."
    });
  }
  const risky = citations.filter((citation) => (citation.riskFlags || []).length);
  if (risky.length) {
    findings.push({
      severity: "high",
      code: "risky-citation",
      message: "One or more recommended citations carry correction or retraction risk.",
      evidence: risky.map((citation) => `${citation.id}: ${(citation.riskFlags || []).join(", ")}`),
      action: "Block risky citations from automatic insertion and suggest safer replacements."
    });
  }
  return findings;
}

function suggestReplacements(coverage, citations, candidatePool, manuscriptYear) {
  const existingRegions = new Set(citations.map((citation) => citation.region));
  const missingNeeds = unique(coverage.flatMap((item) => item.missingNeeds));
  const riskyPurposes = unique(
    citations
      .filter((citation) => (citation.riskFlags || []).length || scoreCitation(citation, manuscriptYear) < 45)
      .flatMap((citation) => citation.citedFor || [])
  );

  return candidatePool
    .map((candidate) => {
      const needHits = missingNeeds.filter((need) => citationMatchesNeed(candidate, need));
      const purposeHits = intersect(candidate.citedFor || [], riskyPurposes);
      const diversityBonus = existingRegions.has(candidate.region) ? 0 : 8;
      const score = scoreCitation(candidate, manuscriptYear) + needHits.length * 8 + purposeHits.length * 5 + diversityBonus;
      return {
        id: candidate.id,
        title: candidate.title,
        score: Math.min(100, score),
        reasons: unique([
          ...needHits.map((need) => `covers missing ${need}`),
          ...purposeHits.map((purpose) => `covers risky ${purpose} slot`),
          candidate.access === "open" ? "open access" : "",
          existingRegions.has(candidate.region) ? "" : `adds ${candidate.region} evidence`
        ])
      };
    })
    .filter((candidate) => candidate.reasons.length)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
}

function auditCitationSet({ manuscript, citations, candidatePool }) {
  const coverage = claimCoverage(manuscript, citations);
  const scoredCitations = citations.map((citation) => ({
    id: citation.id,
    title: citation.title,
    score: scoreCitation(citation, manuscript.year),
    action:
      (citation.riskFlags || []).includes("retracted")
        ? "block"
        : scoreCitation(citation, manuscript.year) >= 65
          ? "keep"
          : "review",
    reasons: unique([
      citation.access === "open" ? "open access" : "closed access",
      manuscript.year - citation.year <= 5 ? "recent" : "older",
      citation.influence === "seminal" ? "seminal" : "",
      ...(citation.riskFlags || [])
    ])
  }));

  const metrics = {
    coverageScore: Number((coverage.reduce((sum, item) => sum + item.coverageScore, 0) / coverage.length).toFixed(2)),
    openAccessShare: Number(ratio(citations.filter((citation) => citation.access === "open").length, citations.length).toFixed(2)),
    recentShare: Number(ratio(citations.filter((citation) => manuscript.year - citation.year <= 5).length, citations.length).toFixed(2)),
    seminalShare: Number(ratio(citations.filter((citation) => citation.influence === "seminal").length, citations.length).toFixed(2)),
    topRegionShare: Number(topShare(citations, (citation) => citation.region).toFixed(2)),
    topVenueShare: Number(topShare(citations, (citation) => citation.venue).toFixed(2)),
    distinctRegions: unique(citations.map((citation) => citation.region)).length,
    distinctVenues: unique(citations.map((citation) => citation.venue)).length,
    coveredDomains: intersect(manuscript.domains, unique(flatten(citations, "domains"))),
    coveredMethods: intersect(manuscript.methods, unique(flatten(citations, "methods"))),
    coveredPopulations: intersect(manuscript.populations, unique(flatten(citations, "populations")))
  };

  const findings = buildFindings(metrics, coverage, citations);
  const replacements = suggestReplacements(coverage, citations, candidatePool || [], manuscript.year);
  const readinessScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        metrics.coverageScore * 45 +
          metrics.openAccessShare * 15 +
          (1 - Math.max(0, metrics.topRegionShare - 0.5)) * 15 +
          (1 - Math.max(0, metrics.topVenueShare - 0.35)) * 10 +
          metrics.recentShare * 10 +
          metrics.seminalShare * 5 -
          findings.filter((finding) => finding.severity === "high").length * 12
      )
    )
  );

  return {
    manuscriptId: manuscript.id,
    generatedBy: "citation-diversity-coverage-auditor",
    readiness: readinessScore >= 78 ? "ready-with-review" : "needs-revision",
    readinessScore,
    metrics,
    coverage,
    citationActions: scoredCitations,
    findings,
    replacementSuggestions: replacements,
    reviewerActions: findings.map((finding) => finding.action),
    auditDigest: [
      `${citations.length} recommendations checked`,
      `${metrics.coveredDomains.length}/${manuscript.domains.length} manuscript domains covered`,
      `${metrics.coveredMethods.length}/${manuscript.methods.length} methods covered`,
      `${metrics.coveredPopulations.length}/${manuscript.populations.length} populations covered`,
      `${findings.length} findings emitted`
    ]
  };
}

function renderReviewerMarkdown(audit) {
  const lines = [
    `# Citation Diversity Coverage Auditor`,
    ``,
    `Manuscript: ${audit.manuscriptId}`,
    `Readiness: ${audit.readiness} (${audit.readinessScore}/100)`,
    ``,
    `## Metrics`,
    ``,
    `- Claim coverage: ${audit.metrics.coverageScore}`,
    `- Open-access share: ${audit.metrics.openAccessShare}`,
    `- Recent share: ${audit.metrics.recentShare}`,
    `- Top-region share: ${audit.metrics.topRegionShare}`,
    `- Top-venue share: ${audit.metrics.topVenueShare}`,
    ``,
    `## Findings`,
    ``
  ];

  audit.findings.forEach((finding) => {
    lines.push(`- [${finding.severity}] ${finding.code}: ${finding.message}`);
    lines.push(`  Action: ${finding.action}`);
  });

  lines.push(``, `## Replacement Suggestions`, ``);
  audit.replacementSuggestions.forEach((suggestion) => {
    lines.push(`- ${suggestion.id}: ${suggestion.title} (${suggestion.score}/100)`);
    lines.push(`  Reasons: ${suggestion.reasons.join("; ")}`);
  });

  lines.push(``, `## Citation Actions`, ``);
  audit.citationActions.forEach((citation) => {
    lines.push(`- ${citation.id}: ${citation.action} (${citation.score}/100)`);
  });

  return `${lines.join("\n")}\n`;
}

function renderSvgSummary(audit) {
  const barWidth = Math.round((audit.readinessScore / 100) * 760);
  const findingText = audit.findings.map((finding, index) => {
    const y = 310 + index * 36;
    return `<text x="60" y="${y}" fill="#0f172a" font-size="20">${finding.severity.toUpperCase()} ${finding.code}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#f8fafc"/>
  <text x="60" y="76" fill="#0f172a" font-size="34" font-family="Arial, sans-serif" font-weight="700">Citation Diversity Coverage Auditor</text>
  <text x="60" y="120" fill="#334155" font-size="22" font-family="Arial, sans-serif">Readiness: ${audit.readiness} (${audit.readinessScore}/100)</text>
  <rect x="60" y="158" width="760" height="34" rx="4" fill="#e2e8f0"/>
  <rect x="60" y="158" width="${barWidth}" height="34" rx="4" fill="#2563eb"/>
  <text x="60" y="242" fill="#0f172a" font-size="22" font-family="Arial, sans-serif">Coverage ${audit.metrics.coverageScore} | OA ${audit.metrics.openAccessShare} | Regions ${audit.metrics.distinctRegions} | Venues ${audit.metrics.distinctVenues}</text>
  <text x="60" y="286" fill="#334155" font-size="20" font-family="Arial, sans-serif">Reviewer findings</text>
  ${findingText}
</svg>
`;
}

module.exports = {
  auditCitationSet,
  renderReviewerMarkdown,
  renderSvgSummary,
  scoreCitation,
  claimCoverage
};
