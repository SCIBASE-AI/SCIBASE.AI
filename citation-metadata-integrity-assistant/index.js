const crypto = require("crypto");

const DOI_RE = /^10\.\d{4,9}\/[-._;()/:a-z0-9]+$/i;
const ARXIV_RE = /^(?:arxiv:)?\d{4}\.\d{4,5}(?:v\d+)?$/i;
const PMCID_RE = /^PMC\d+$/i;

const SEVERITY_ORDER = {
  blocker: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4
};

function buildMetadataIntegrityReport(batch, options = {}) {
  validateBatch(batch);

  const checkedAt = options.checkedAt || "2026-05-22T00:00:00.000Z";
  const canonicalByDoi = new Map();
  const canonicalByPmcid = new Map();
  const canonicalByArxiv = new Map();
  for (const record of batch.canonicalRecords) {
    if (record.doi) canonicalByDoi.set(normalizeDoi(record.doi), record);
    if (record.pmcid) canonicalByPmcid.set(normalizePmcid(record.pmcid), record);
    if (record.arxiv) canonicalByArxiv.set(normalizeArxiv(record.arxiv), record);
  }

  const referenceFindings = batch.candidateReferences.map((reference) =>
    evaluateReference(reference, { canonicalByDoi, canonicalByPmcid, canonicalByArxiv })
  );
  const duplicateGroups = findDuplicateGroups(batch.candidateReferences, referenceFindings);
  const actions = buildActions(referenceFindings, duplicateGroups);
  const summary = summarize(referenceFindings, duplicateGroups);
  const decision = buildDecision(summary, actions);

  const report = {
    batch: {
      id: batch.id,
      manuscriptTitle: batch.manuscriptTitle,
      toolMode: batch.toolMode,
      citationStyle: batch.citationStyle
    },
    checkedAt,
    decision,
    summary,
    referenceFindings,
    duplicateGroups,
    actions,
    insertionPlan: buildInsertionPlan(batch.candidateReferences, referenceFindings, duplicateGroups),
    reproducibilityContext: {
      dataPolicy: "synthetic fixture only",
      canonicalFingerprint: digest(batch.canonicalRecords),
      deterministic: true,
      externalNetworkCalls: 0
    }
  };
  report.auditDigest = digest(report);
  return report;
}

function validateBatch(batch) {
  if (!batch || typeof batch !== "object") {
    throw new TypeError("batch must be an object");
  }
  if (!Array.isArray(batch.candidateReferences) || batch.candidateReferences.length === 0) {
    throw new Error("candidateReferences must be a non-empty array");
  }
  if (!Array.isArray(batch.canonicalRecords) || batch.canonicalRecords.length === 0) {
    throw new Error("canonicalRecords must be a non-empty array");
  }
  for (const reference of batch.candidateReferences) {
    if (!reference.id || !reference.title || !reference.year) {
      throw new Error("each candidate reference needs id, title, and year");
    }
  }
}

function evaluateReference(reference, indexes) {
  const identifierFindings = evaluateIdentifiers(reference);
  const canonical = findCanonical(reference, indexes);
  const metadataFindings = canonical ? compareMetadata(reference, canonical) : [{
    type: "missing_canonical_record",
    severity: "medium",
    message: "No synthetic canonical record matched this candidate reference."
  }];
  const findings = identifierFindings.concat(metadataFindings);
  const severity = worstSeverity(findings);

  return {
    referenceId: reference.id,
    normalizedDoi: reference.doi ? normalizeDoi(reference.doi) : null,
    normalizedPmcid: reference.pmcid ? normalizePmcid(reference.pmcid) : null,
    normalizedArxiv: reference.arxiv ? normalizeArxiv(reference.arxiv) : null,
    canonicalId: canonical ? canonical.canonicalId : null,
    severity,
    status: severity === "blocker" || severity === "high" ? "defer" : severity === "info" ? "insert" : "revise",
    findings,
    correctedMetadata: canonical ? buildCorrectedMetadata(reference, canonical) : null
  };
}

function evaluateIdentifiers(reference) {
  const findings = [];

  if (!reference.doi && !reference.pmcid && !reference.arxiv && !reference.url) {
    findings.push({
      type: "missing_identifier",
      severity: "blocker",
      message: "Reference has no DOI, PMCID, arXiv ID, or URL for citation insertion."
    });
  }

  if (reference.doi && !DOI_RE.test(normalizeDoi(reference.doi))) {
    findings.push({
      type: "malformed_doi",
      severity: "blocker",
      message: `Malformed DOI: ${reference.doi}`
    });
  }

  if (reference.arxiv && !ARXIV_RE.test(normalizeArxiv(reference.arxiv))) {
    findings.push({
      type: "malformed_arxiv",
      severity: "high",
      message: `Malformed arXiv identifier: ${reference.arxiv}`
    });
  }

  if (reference.pmcid && !PMCID_RE.test(normalizePmcid(reference.pmcid))) {
    findings.push({
      type: "malformed_pmcid",
      severity: "high",
      message: `PMCID must include the PMC prefix: ${reference.pmcid}`
    });
  }

  if (reference.url) {
    const parsed = parseUrl(reference.url);
    if (!parsed) {
      findings.push({
        type: "malformed_url",
        severity: "medium",
        message: `URL could not be parsed: ${reference.url}`
      });
    } else if (parsed.protocol !== "https:") {
      findings.push({
        type: "insecure_url",
        severity: "low",
        message: `Prefer canonical HTTPS URL instead of ${reference.url}`
      });
    }
  }

  if (findings.length === 0) {
    findings.push({
      type: "identifier_valid",
      severity: "info",
      message: "Identifier formats are valid."
    });
  }
  return findings;
}

function findCanonical(reference, indexes) {
  if (reference.doi) {
    const byDoi = indexes.canonicalByDoi.get(normalizeDoi(reference.doi));
    if (byDoi) return byDoi;
  }
  if (reference.pmcid) {
    const byPmcid = indexes.canonicalByPmcid.get(normalizePmcid(reference.pmcid));
    if (byPmcid) return byPmcid;
  }
  if (reference.arxiv) {
    const byArxiv = indexes.canonicalByArxiv.get(normalizeArxiv(reference.arxiv));
    if (byArxiv) return byArxiv;
  }
  return null;
}

function compareMetadata(reference, canonical) {
  const findings = [];
  const titleScore = tokenSimilarity(reference.title, canonical.title);
  if (titleScore < 0.75) {
    findings.push({
      type: "title_mismatch",
      severity: "high",
      message: `Candidate title diverges from canonical title "${canonical.title}".`
    });
  } else if (reference.title !== canonical.title) {
    findings.push({
      type: "title_normalization",
      severity: "low",
      message: "Candidate title should be normalized to canonical capitalization/wording."
    });
  }

  if (Number(reference.year) !== Number(canonical.year)) {
    findings.push({
      type: "year_mismatch",
      severity: "medium",
      message: `Candidate year ${reference.year} differs from canonical year ${canonical.year}.`
    });
  }

  const authorCoverage = authorSurnameCoverage(reference.authors || [], canonical.authors || []);
  if (authorCoverage < 0.6) {
    findings.push({
      type: "author_mismatch",
      severity: "medium",
      message: "Candidate author list does not match canonical author surnames."
    });
  } else if (authorCoverage < 1 || hasAbbreviatedAuthorNames(reference.authors || [], canonical.authors || [])) {
    findings.push({
      type: "author_normalization",
      severity: "low",
      message: "Candidate author initials should be expanded or normalized."
    });
  }

  if (canonical.url && reference.url && reference.url !== canonical.url) {
    findings.push({
      type: "canonical_url_update",
      severity: parseUrl(reference.url) && parseUrl(reference.url).protocol === "https:" ? "low" : "medium",
      message: `Use canonical URL ${canonical.url}.`
    });
  }

  if (findings.length === 0) {
    findings.push({
      type: "metadata_valid",
      severity: "info",
      message: "Candidate metadata matches the synthetic canonical record."
    });
  }
  return findings;
}

function buildCorrectedMetadata(reference, canonical) {
  return {
    title: canonical.title,
    year: canonical.year,
    authors: canonical.authors.slice(),
    doi: canonical.doi || reference.doi || null,
    pmcid: canonical.pmcid || reference.pmcid || null,
    arxiv: canonical.arxiv || reference.arxiv || null,
    url: canonical.url || reference.url || null
  };
}

function findDuplicateGroups(references, findings) {
  const byKey = new Map();
  for (const reference of references) {
    const key = duplicateKey(reference);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(reference.id);
  }

  const findingById = new Map(findings.map((finding) => [finding.referenceId, finding]));
  return [...byKey.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([key, ids]) => {
      const sortedIds = ids.slice().sort();
      const preferred = sortedIds
        .map((id) => findingById.get(id))
        .sort((left, right) => {
          const severityDelta = SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity];
          if (severityDelta !== 0) return severityDelta;
          return left.referenceId.localeCompare(right.referenceId);
        })
        .pop();
      return {
        key,
        referenceIds: sortedIds,
        severity: "medium",
        preferredReferenceId: preferred.referenceId,
        action: `Merge ${sortedIds.join(", ")} into canonical bibliography entry ${preferred.referenceId}.`
      };
    })
    .sort((left, right) => left.key.localeCompare(right.key));
}

function duplicateKey(reference) {
  if (reference.doi && DOI_RE.test(normalizeDoi(reference.doi))) {
    return `doi:${normalizeDoi(reference.doi)}`;
  }
  if (reference.pmcid && PMCID_RE.test(normalizePmcid(reference.pmcid))) {
    return `pmcid:${normalizePmcid(reference.pmcid)}`;
  }
  return `title:${normalizeText(reference.title)}:${reference.year}`;
}

function buildActions(referenceFindings, duplicateGroups) {
  const actions = [];
  for (const finding of referenceFindings) {
    const actionable = finding.findings.filter((item) => item.severity !== "info");
    if (actionable.length === 0) continue;
    actions.push({
      priority: finding.severity,
      referenceId: finding.referenceId,
      title: `${finding.status.toUpperCase()} ${finding.referenceId}`,
      action: buildReferenceAction(finding, actionable)
    });
  }
  for (const group of duplicateGroups) {
    actions.push({
      priority: group.severity,
      referenceId: group.preferredReferenceId,
      title: `MERGE duplicate references ${group.referenceIds.join(", ")}`,
      action: group.action
    });
  }
  return actions.sort((left, right) => {
    const severityDelta = SEVERITY_ORDER[left.priority] - SEVERITY_ORDER[right.priority];
    if (severityDelta !== 0) return severityDelta;
    return left.title.localeCompare(right.title);
  });
}

function buildReferenceAction(finding, actionable) {
  if (finding.status === "defer") {
    return `Defer citation insertion until metadata is corrected: ${actionable.map((item) => item.message).join(" ")}`;
  }
  if (finding.correctedMetadata) {
    return `Revise citation metadata to canonical title "${finding.correctedMetadata.title}" and canonical year ${finding.correctedMetadata.year}.`;
  }
  return `Review citation metadata: ${actionable.map((item) => item.message).join(" ")}`;
}

function buildInsertionPlan(references, findings, duplicateGroups) {
  const duplicateMembers = new Set(duplicateGroups.flatMap((group) => group.referenceIds));
  const preferredMembers = new Set(duplicateGroups.map((group) => group.preferredReferenceId));
  const findingById = new Map(findings.map((finding) => [finding.referenceId, finding]));

  return references.map((reference) => {
    const finding = findingById.get(reference.id);
    let action = finding.status;
    if (duplicateMembers.has(reference.id) && !preferredMembers.has(reference.id)) {
      action = "merge_duplicate";
    }
    return {
      referenceId: reference.id,
      action,
      canonicalId: finding.canonicalId,
      citationText: finding.correctedMetadata ? formatNatureCitation(finding.correctedMetadata) : null,
      reason: finding.findings.filter((item) => item.severity !== "info").map((item) => item.message)
    };
  });
}

function summarize(referenceFindings, duplicateGroups) {
  const bySeverity = { blocker: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const finding of referenceFindings) {
    bySeverity[finding.severity] += 1;
  }
  const deferred = referenceFindings.filter((finding) => finding.status === "defer").length;
  const revised = referenceFindings.filter((finding) => finding.status === "revise").length;
  const score = Math.max(
    0,
    100 - bySeverity.blocker * 30 - bySeverity.high * 20 - bySeverity.medium * 10 - duplicateGroups.length * 8
  );
  return {
    score,
    referencesChecked: referenceFindings.length,
    duplicateGroups: duplicateGroups.length,
    deferredReferences: deferred,
    revisionReferences: revised,
    blockers: bySeverity.blocker,
    high: bySeverity.high,
    medium: bySeverity.medium
  };
}

function buildDecision(summary, actions) {
  if (summary.blockers > 0 || summary.high > 0) {
    return {
      status: "hold",
      reason: "One or more citation candidates have malformed or conflicting metadata.",
      nextAction: actions[0] ? actions[0].action : "Review citation metadata."
    };
  }
  if (summary.medium > 0 || summary.duplicateGroups > 0) {
    return {
      status: "revise",
      reason: "Citation metadata can be inserted after normalization and duplicate merge actions.",
      nextAction: actions[0] ? actions[0].action : "Normalize citations."
    };
  }
  return {
    status: "pass",
    reason: "All citation candidates are metadata-clean.",
    nextAction: "Proceed with citation insertion."
  };
}

function formatNatureCitation(metadata) {
  const surnames = metadata.authors.map((author) => author.split(/\s+/).slice(-1)[0]).join(", ");
  return `${surnames}. ${metadata.title}. (${metadata.year}). ${metadata.doi || metadata.url || ""}`.trim();
}

function worstSeverity(findings) {
  return findings.slice().sort((left, right) =>
    SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity]
  )[0].severity;
}

function normalizeDoi(value) {
  return String(value || "").trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "").toLowerCase();
}

function normalizePmcid(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeArxiv(value) {
  return String(value || "").trim().replace(/^arxiv:/i, "").toLowerCase();
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function parseUrl(value) {
  try {
    return new URL(value);
  } catch (_error) {
    return null;
  }
}

function tokenSimilarity(left, right) {
  const leftTokens = new Set(normalizeText(left).split(/\s+/).filter(Boolean));
  const rightTokens = new Set(normalizeText(right).split(/\s+/).filter(Boolean));
  const union = new Set([...leftTokens, ...rightTokens]);
  if (union.size === 0) return 1;
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return intersection / union.size;
}

function authorSurnameCoverage(authors, canonicalAuthors) {
  const candidate = new Set(authors.map((author) => surname(author)).filter(Boolean));
  const canonical = canonicalAuthors.map((author) => surname(author)).filter(Boolean);
  if (canonical.length === 0) return 1;
  const matches = canonical.filter((name) => candidate.has(name)).length;
  return matches / canonical.length;
}

function hasAbbreviatedAuthorNames(authors, canonicalAuthors) {
  const canonicalBySurname = new Map();
  for (const author of canonicalAuthors) {
    canonicalBySurname.set(surname(author), String(author));
  }
  return authors.some((author) => {
    const canonical = canonicalBySurname.get(surname(author));
    if (!canonical) return false;
    const firstToken = String(author).trim().split(/\s+/)[0] || "";
    const canonicalFirst = canonical.trim().split(/\s+/)[0] || "";
    return firstToken.length <= 2 && canonicalFirst.length > 2;
  });
}

function surname(author) {
  const parts = String(author || "").toLowerCase().replace(/[^a-z\s-]/g, "").trim().split(/\s+/);
  return parts[parts.length - 1] || "";
}

function toMarkdown(report) {
  const lines = [
    "# Citation Metadata Integrity Report",
    "",
    `Manuscript: ${report.batch.manuscriptTitle}`,
    `Decision: ${report.decision.status.toUpperCase()}`,
    `Score: ${report.summary.score}`,
    `Audit digest: ${report.auditDigest}`,
    "",
    "## Summary",
    "",
    `- References checked: ${report.summary.referencesChecked}`,
    `- Duplicate groups: ${report.summary.duplicateGroups}`,
    `- Deferred references: ${report.summary.deferredReferences}`,
    `- References needing revision: ${report.summary.revisionReferences}`,
    "",
    "## Actions",
    ""
  ];

  for (const action of report.actions) {
    lines.push(`- [${action.priority}] ${action.title}: ${action.action}`);
  }

  lines.push("", "## Insertion Plan", "");
  for (const item of report.insertionPlan) {
    lines.push(`- ${item.referenceId}: ${item.action}${item.citationText ? ` -> ${item.citationText}` : ""}`);
  }

  lines.push("", "## Reproducibility Context", "");
  lines.push(`- Data policy: ${report.reproducibilityContext.dataPolicy}`);
  lines.push(`- External network calls: ${report.reproducibilityContext.externalNetworkCalls}`);
  lines.push(`- Canonical fingerprint: ${report.reproducibilityContext.canonicalFingerprint}`);

  return `${lines.join("\n")}\n`;
}

function toSvg(report) {
  const bars = [
    { label: "Deferred", value: report.summary.deferredReferences, color: "#b91c1c" },
    { label: "Revisions", value: report.summary.revisionReferences, color: "#b45309" },
    { label: "Duplicates", value: report.summary.duplicateGroups, color: "#1d4ed8" },
    { label: "Score", value: report.summary.score, color: "#047857" }
  ];
  const maxValue = Math.max(1, ...bars.map((bar) => bar.value));
  const barMarkup = bars.map((bar, index) => {
    const y = 230 + index * 70;
    const width = Math.round((bar.value / maxValue) * 540);
    return [
      `<text x="80" y="${y}" font-family="Arial, sans-serif" font-size="26" fill="#172554">${escapeXml(bar.label)}</text>`,
      `<rect x="260" y="${y - 28}" width="560" height="36" rx="4" fill="#e5e7eb"/>`,
      `<rect x="260" y="${y - 28}" width="${width}" height="36" rx="4" fill="${bar.color}"/>`,
      `<text x="845" y="${y}" font-family="Arial, sans-serif" font-size="26" fill="#111827">${bar.value}</text>`
    ].join("\n");
  }).join("\n");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="620" viewBox="0 0 1100 620" role="img" aria-label="Citation metadata integrity assistant summary">`,
    `<rect width="1100" height="620" fill="#f8fafc"/>`,
    `<rect x="48" y="44" width="1004" height="532" rx="8" fill="#ffffff" stroke="#cbd5e1"/>`,
    `<text x="80" y="112" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#0f172a">Citation Metadata Integrity Assistant</text>`,
    `<text x="80" y="160" font-family="Arial, sans-serif" font-size="24" fill="#334155">Gate: ${escapeXml(report.decision.status.toUpperCase())} | Score: ${report.summary.score} | Digest: ${escapeXml(report.auditDigest.slice(0, 16))}</text>`,
    barMarkup,
    `<text x="80" y="548" font-family="Arial, sans-serif" font-size="22" fill="#475569">Synthetic citation metadata only. No DOI, PubMed, arXiv, or network lookups.</text>`,
    `</svg>`
  ].join("\n");
}

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableStringify(value[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  buildMetadataIntegrityReport,
  toMarkdown,
  toSvg,
  normalizeDoi,
  normalizePmcid,
  normalizeArxiv,
  tokenSimilarity,
  digest
};
