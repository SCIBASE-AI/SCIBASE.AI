import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const STOP_WORDS = new Set([
  "about",
  "after",
  "against",
  "between",
  "because",
  "before",
  "could",
  "during",
  "every",
  "fully",
  "their",
  "there",
  "these",
  "those",
  "through",
  "under",
  "using",
  "where",
  "which",
  "while",
  "without"
]);

export function buildCitationProvenanceReadiness(project) {
  const normalized = normalizeProject(project);
  const claims = normalized.claims.map((claim) => enrichClaim(claim, normalized));
  const bibliography = buildBibliographyIndex(normalized.bibliography);
  const citedKeys = unique(claims.flatMap((claim) => claim.citationKeys));
  const missingBibliography = citedKeys.filter((key) => !bibliography.has(key));
  const unusedBibliography = normalized.bibliography
    .map((entry) => entry.key)
    .filter((key) => !citedKeys.includes(key));

  const citationInsertions = claims
    .filter((claim) => claim.citationKeys.length === 0 || claim.citationKeys.some((key) => !bibliography.has(key)))
    .map((claim) => buildInsertionPlan(claim, normalized.candidateCitations));

  const diagnostics = [
    ...buildClaimDiagnostics(claims, bibliography),
    ...buildProjectDiagnostics(normalized)
  ];

  const severityCounts = countSeverities(diagnostics);
  const readinessScore = Math.max(
    0,
    100 - severityCounts.high * 18 - severityCounts.medium * 8 - severityCounts.low * 3
  );

  const readinessStatus =
    severityCounts.high > 0 ? "hold" : severityCounts.medium > 0 ? "review-needed" : "ready";

  const summaries = buildSummaryModes(normalized, claims, diagnostics);
  const reportCore = {
    projectId: normalized.id,
    title: normalized.title,
    readinessStatus,
    readinessScore,
    claimCount: claims.length,
    evidenceArtifactCount: normalized.evidenceArtifacts.length,
    citedKeys,
    missingBibliography,
    unusedBibliography,
    diagnostics,
    citationInsertions,
    summaries
  };

  return {
    ...reportCore,
    digest: digest(reportCore)
  };
}

export function normalizeProject(project) {
  if (!project || typeof project !== "object") {
    throw new TypeError("Project input must be an object.");
  }

  return {
    id: requiredString(project.id, "id"),
    title: requiredString(project.title, "title"),
    manuscript: {
      sections: array(project.manuscript?.sections, "manuscript.sections").map((section) => ({
        id: requiredString(section.id, "section.id"),
        title: requiredString(section.title, "section.title"),
        text: requiredString(section.text, "section.text")
      }))
    },
    claims: array(project.claims, "claims").map((claim) => ({
      id: requiredString(claim.id, "claim.id"),
      sectionId: requiredString(claim.sectionId, "claim.sectionId"),
      text: requiredString(claim.text, "claim.text"),
      citationKeys: array(claim.citationKeys ?? [], "claim.citationKeys"),
      evidenceIds: array(claim.evidenceIds ?? [], "claim.evidenceIds"),
      tags: array(claim.tags ?? [], "claim.tags")
    })),
    bibliography: array(project.bibliography ?? [], "bibliography").map((entry) => ({
      key: requiredString(entry.key, "bibliography.key"),
      title: requiredString(entry.title, "bibliography.title"),
      authors: array(entry.authors ?? [], "bibliography.authors"),
      year: Number(entry.year),
      venue: entry.venue ?? "",
      doi: entry.doi ?? "",
      url: entry.url ?? ""
    })),
    candidateCitations: array(project.candidateCitations ?? [], "candidateCitations").map((entry) => ({
      key: requiredString(entry.key, "candidateCitations.key"),
      title: requiredString(entry.title, "candidateCitations.title"),
      authors: array(entry.authors ?? [], "candidateCitations.authors"),
      year: Number(entry.year),
      venue: entry.venue ?? "",
      doi: entry.doi ?? "",
      url: entry.url ?? "",
      tags: array(entry.tags ?? [], "candidateCitations.tags"),
      openAccess: Boolean(entry.openAccess)
    })),
    evidenceArtifacts: array(project.evidenceArtifacts ?? [], "evidenceArtifacts").map((artifact) => ({
      id: requiredString(artifact.id, "evidenceArtifacts.id"),
      label: requiredString(artifact.label, "evidenceArtifacts.label"),
      type: requiredString(artifact.type, "evidenceArtifacts.type"),
      checksum: artifact.checksum ?? "",
      access: artifact.access ?? "unknown",
      supports: array(artifact.supports ?? [], "evidenceArtifacts.supports")
    })),
    compliance: {
      dataAvailability: Boolean(project.compliance?.dataAvailability),
      ethicsStatement: Boolean(project.compliance?.ethicsStatement),
      codeAvailability: Boolean(project.compliance?.codeAvailability)
    }
  };
}

export function rankCandidateCitations(claim, candidateCitations) {
  const claimTerms = new Set([...extractTerms(claim.text), ...claim.tags.map(normalizeTerm)]);

  return candidateCitations
    .map((candidate) => {
      const candidateTerms = new Set([
        ...extractTerms(candidate.title),
        ...candidate.tags.map(normalizeTerm),
        ...extractTerms(candidate.venue)
      ]);
      const overlap = [...claimTerms].filter((term) => candidateTerms.has(term));
      const recencyBoost = Number.isFinite(candidate.year) ? Math.max(0, Math.min(8, candidate.year - 2018)) : 0;
      const doiBoost = candidate.doi ? 4 : 0;
      const openAccessBoost = candidate.openAccess ? 3 : 0;
      const score = overlap.length * 8 + recencyBoost + doiBoost + openAccessBoost;

      return {
        key: candidate.key,
        title: candidate.title,
        score,
        reasons: [
          overlap.length ? `matches ${overlap.slice(0, 5).join(", ")}` : "low lexical overlap",
          candidate.openAccess ? "open access" : "access needs review",
          candidate.doi ? "has DOI" : "missing DOI"
        ],
        formatted: {
          apa: formatCitation(candidate, "apa"),
          nature: formatCitation(candidate, "nature")
        }
      };
    })
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
}

export function formatCitation(entry, style = "apa") {
  const authors = entry.authors?.length ? entry.authors.join(", ") : "Unknown";
  const year = Number.isFinite(entry.year) ? entry.year : "n.d.";

  if (style === "nature") {
    return `${authors}. ${entry.title}. ${entry.venue || "Unpublished"} (${year}).`;
  }

  const doi = entry.doi ? ` https://doi.org/${entry.doi}` : entry.url ? ` ${entry.url}` : "";
  return `${authors} (${year}). ${entry.title}. ${entry.venue || "Unpublished"}.${doi}`;
}

function enrichClaim(claim, project) {
  const section = project.manuscript.sections.find((candidate) => candidate.id === claim.sectionId);
  const evidence = claim.evidenceIds
    .map((id) => project.evidenceArtifacts.find((artifact) => artifact.id === id))
    .filter(Boolean);

  return {
    ...claim,
    sectionTitle: section?.title ?? "Unknown section",
    evidence,
    hasStatisticalClaim: /\bp\s*[<=>]\s*0?\.\d+|\bstatistically significant\b/i.test(claim.text),
    hasConfidenceInterval: /\bconfidence interval\b|\bci\b|95%/i.test(claim.text)
  };
}

function buildBibliographyIndex(entries) {
  return new Map(entries.map((entry) => [entry.key, entry]));
}

function buildInsertionPlan(claim, candidateCitations) {
  const ranked = rankCandidateCitations(claim, candidateCitations).slice(0, 3);
  const top = ranked[0] ?? null;

  return {
    claimId: claim.id,
    claimText: claim.text,
    sectionTitle: claim.sectionTitle,
    currentCitationKeys: claim.citationKeys,
    recommendedCitations: ranked,
    insertionText: top
      ? `${claim.text} @${top.key}`
      : claim.text,
    reviewerNote: top
      ? `Add @${top.key} or another source that supports the claim before release.`
      : "No candidate citation scored above zero; request a domain reviewer source."
  };
}

function buildClaimDiagnostics(claims, bibliography) {
  const diagnostics = [];

  for (const claim of claims) {
    if (claim.citationKeys.length === 0) {
      diagnostics.push({
        id: `claim-${claim.id}-citation-gap`,
        severity: "high",
        claimId: claim.id,
        area: "citation",
        message: "Claim has no supporting citation key.",
        action: "Add at least one source-backed citation or mark the claim as internal preliminary evidence."
      });
    }

    for (const key of claim.citationKeys) {
      if (!bibliography.has(key)) {
        diagnostics.push({
          id: `claim-${claim.id}-missing-${key}`,
          severity: "high",
          claimId: claim.id,
          area: "bibliography",
          message: `Citation key @${key} is used but missing from the bibliography.`,
          action: `Add a bibliography record for @${key} or replace it with a verified source.`
        });
      }
    }

    if (claim.evidence.length === 0) {
      diagnostics.push({
        id: `claim-${claim.id}-evidence-gap`,
        severity: "medium",
        claimId: claim.id,
        area: "evidence",
        message: "Claim is not linked to a local evidence artifact.",
        action: "Attach a dataset, notebook, protocol, or reviewer note with a stable checksum."
      });
    }

    if (claim.hasStatisticalClaim && !claim.hasConfidenceInterval) {
      diagnostics.push({
        id: `claim-${claim.id}-statistical-context`,
        severity: "medium",
        claimId: claim.id,
        area: "statistics",
        message: "Statistical claim mentions significance without confidence interval context.",
        action: "Add effect size and confidence interval context before pre-review."
      });
    }
  }

  return diagnostics;
}

function buildProjectDiagnostics(project) {
  const diagnostics = [];
  const fullText = project.manuscript.sections.map((section) => section.text).join("\n");

  if (!project.compliance.dataAvailability && /dataset|data|cohort|sample/i.test(fullText)) {
    diagnostics.push({
      id: "project-data-availability",
      severity: "high",
      area: "compliance",
      message: "Manuscript discusses data but the data availability statement is not ready.",
      action: "Add a data availability statement or explain controlled-access restrictions."
    });
  }

  if (!project.compliance.codeAvailability && /notebook|pipeline|script|model/i.test(fullText)) {
    diagnostics.push({
      id: "project-code-availability",
      severity: "medium",
      area: "compliance",
      message: "Manuscript discusses executable work but code availability is not ready.",
      action: "Publish or attach the relevant notebook, script, or reproducibility runbook."
    });
  }

  if (/patient|human subject|clinical/i.test(fullText) && !project.compliance.ethicsStatement) {
    diagnostics.push({
      id: "project-ethics-statement",
      severity: "medium",
      area: "compliance",
      message: "Human-subject language appears without an ethics statement.",
      action: "Add IRB, consent, or non-human-subject justification before external review."
    });
  }

  return diagnostics;
}

function buildSummaryModes(project, claims, diagnostics) {
  const topTags = unique(claims.flatMap((claim) => claim.tags)).slice(0, 5);
  const highCount = diagnostics.filter((diagnostic) => diagnostic.severity === "high").length;
  const supportedClaims = claims.filter((claim) => claim.citationKeys.length > 0 && claim.evidence.length > 0).length;

  return {
    abstract: `${project.title} was screened for citation provenance across ${claims.length} claims. ${supportedClaims} claims already link both citations and local evidence, while ${highCount} high-priority provenance gaps need review.`,
    executive: `Readiness depends on closing ${highCount} high-priority gaps before release. Main topics checked: ${topTags.join(", ")}.`,
    layperson: `This report checks whether important research claims have trustworthy sources and evidence files before the paper is shared.`
  };
}

function countSeverities(diagnostics) {
  return diagnostics.reduce(
    (counts, diagnostic) => {
      counts[diagnostic.severity] += 1;
      return counts;
    },
    { high: 0, medium: 0, low: 0 }
  );
}

function extractTerms(text) {
  return unique(
    String(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .map(normalizeTerm)
      .filter((term) => term.length > 4 && !STOP_WORDS.has(term))
  );
}

function normalizeTerm(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9-]/g, "");
}

function digest(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

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

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && value !== ""))];
}

function requiredString(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${fieldName} must be a non-empty string.`);
  }

  return value;
}

function array(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${fieldName} must be an array.`);
  }

  return value;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const inputPath = process.argv[2] ?? new URL("../examples/project.json", import.meta.url);
  const project = JSON.parse(readFileSync(inputPath, "utf8"));
  const report = buildCitationProvenanceReadiness(project);
  const topInsertion = report.citationInsertions[0];
  const topDiagnostic = report.diagnostics[0];

  console.log(`Project: ${report.title}`);
  console.log(`Status: ${report.readinessStatus}`);
  console.log(`Readiness score: ${report.readinessScore}`);
  console.log(`Claims reviewed: ${report.claimCount}`);
  console.log(`Missing bibliography keys: ${report.missingBibliography.join(", ") || "none"}`);
  console.log(`Top citation insertion: ${topInsertion?.recommendedCitations[0]?.key ?? "none"}`);
  console.log(`Top reviewer action: ${topDiagnostic?.action ?? "No action needed."}`);
  console.log(`Digest: ${report.digest}`);
}
