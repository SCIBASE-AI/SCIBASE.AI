"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const NOVELTY_TERMS = [
  "first",
  "novel",
  "unprecedented",
  "never",
  "unique",
  "only",
  "breakthrough"
];

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "our",
  "that",
  "the",
  "this",
  "to",
  "with",
  "without"
]);

function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function uniqueTokens(text) {
  return new Set(tokenize(text));
}

function jaccard(left, right) {
  const a = left instanceof Set ? left : uniqueTokens(left);
  const b = right instanceof Set ? right : uniqueTokens(right);
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  return intersection / union.size;
}

function adjacentText(work) {
  return [
    work.title,
    ...(work.topics || []),
    ...(work.methods || []),
    ...(work.findings || [])
  ].join(" ");
}

function usesNoveltyLanguage(text) {
  const words = uniqueTokens(text);
  return NOVELTY_TERMS.some((term) => words.has(term));
}

function scoreAdjacentWork(claim, work) {
  const claimTokens = uniqueTokens(claim.text);
  const workTokens = uniqueTokens(adjacentText(work));
  const lexicalOverlap = jaccard(claimTokens, workTokens);
  const topicOverlap = jaccard(claim.text, (work.topics || []).join(" "));
  const methodOverlap = jaccard(claim.text, (work.methods || []).join(" "));
  const findingOverlap = jaccard(claim.text, (work.findings || []).join(" "));
  const cited = claim.citations.includes(work.id);
  const retractedPenalty = work.sourceStatus === "retracted" ? -0.12 : 0;

  const score =
    lexicalOverlap * 0.35 +
    topicOverlap * 0.22 +
    methodOverlap * 0.23 +
    findingOverlap * 0.2 +
    retractedPenalty;

  return {
    workId: work.id,
    title: work.title,
    year: work.year,
    doi: work.doi,
    sourceUrl: work.sourceUrl,
    sourceStatus: work.sourceStatus,
    cited,
    lexicalOverlap: round(lexicalOverlap),
    topicOverlap: round(topicOverlap),
    methodOverlap: round(methodOverlap),
    findingOverlap: round(findingOverlap),
    overlapScore: round(Math.max(score, 0)),
    statusReason: work.statusReason || null
  };
}

function classifyRisk(claim, matches) {
  const top = matches[0];
  const hasNovelty = usesNoveltyLanguage(claim.text);
  const missingHighOverlapCitation = top && top.overlapScore >= 0.18 && !top.cited;
  const retractedSupport = matches.some((match) => match.sourceStatus === "retracted" && match.overlapScore >= 0.12);

  if ((hasNovelty && missingHighOverlapCitation) || retractedSupport) return "high";
  if (missingHighOverlapCitation || hasNovelty) return "medium";
  return "low";
}

function rewriteClaim(claim, matches) {
  const top = matches.find((match) => match.sourceStatus !== "retracted");
  let rewritten = claim.text
    .replace(/\b(first|only|unprecedented|never before)\b/gi, "a scoped")
    .replace(/\bnovel\b/gi, "differentiated");

  if (top && !claim.citations.includes(top.workId)) {
    rewritten += ` Add adjacent-work citation: ${top.workId}.`;
  }
  return rewritten;
}

function reviewerTasksForClaim(claim, risk, matches) {
  const tasks = [];
  const top = matches[0];
  if (risk !== "low") {
    tasks.push({
      type: "novelty-language-review",
      claimId: claim.id,
      message: "Review absolute novelty wording before manuscript release."
    });
  }
  if (top && !top.cited && top.sourceStatus !== "retracted") {
    tasks.push({
      type: "missing-adjacent-work-citation",
      claimId: claim.id,
      message: `Consider citing ${top.workId} because it has the strongest adjacent-work overlap.`
    });
  }
  for (const match of matches.filter((item) => item.sourceStatus === "retracted" && item.overlapScore >= 0.12)) {
    tasks.push({
      type: "retracted-source-warning",
      claimId: claim.id,
      message: `${match.workId} is retracted and should not support this novelty claim.`
    });
  }
  return tasks;
}

function summarizeAudit(manuscript, claimAudits) {
  const high = claimAudits.filter((claim) => claim.risk === "high").length;
  const medium = claimAudits.filter((claim) => claim.risk === "medium").length;
  const missingCitations = claimAudits.flatMap((claim) => claim.citationInsertions).length;
  const topic = manuscript.domain || "the research area";

  return {
    abstractStyle:
      `${manuscript.title} was screened for novelty overstatement across ${claimAudits.length} claims. ` +
      `${high} high-risk and ${medium} medium-risk claims require reviewer attention, with ${missingCitations} adjacent-work citation insertions recommended.`,
    executiveSummary:
      `The novelty-overlap auditor found ${high + medium} claims that should be softened or supported before peer review. ` +
      `Primary action: add adjacent-work citations and replace absolute-first language with scoped contribution statements.`,
    laypersonExplanation:
      `The assistant checked whether the paper says it is more new than the evidence supports. ` +
      `It points reviewers to similar prior work in ${topic} and suggests safer wording.`
  };
}

function auditNoveltyOverlap(manuscript, adjacentWorks, options = {}) {
  const maxMatches = options.maxMatches || 3;
  const claimAudits = manuscript.sections.map((claim) => {
    const matches = adjacentWorks
      .map((work) => scoreAdjacentWork(claim, work))
      .sort((left, right) => right.overlapScore - left.overlapScore)
      .slice(0, maxMatches);
    const risk = classifyRisk(claim, matches);
    const citationInsertions = matches
      .filter((match) => match.sourceStatus !== "retracted" && !match.cited && match.overlapScore >= 0.12)
      .map((match) => ({
        claimId: claim.id,
        workId: match.workId,
        reason: `overlap score ${match.overlapScore} with uncited adjacent work`
      }));

    return {
      claimId: claim.id,
      location: claim.location,
      contributionType: claim.contributionType,
      originalText: claim.text,
      risk,
      usesNoveltyLanguage: usesNoveltyLanguage(claim.text),
      evidenceRefs: claim.evidenceRefs,
      currentCitations: claim.citations,
      topMatches: matches,
      citationInsertions,
      rewrittenClaim: rewriteClaim(claim, matches),
      reviewerTasks: reviewerTasksForClaim(claim, risk, matches)
    };
  });

  const reviewerTasks = claimAudits.flatMap((claim) => claim.reviewerTasks);
  const payload = {
    manuscriptId: manuscript.id,
    title: manuscript.title,
    domain: manuscript.domain,
    generatedAt: new Date("2026-05-20T09:50:00.000Z").toISOString(),
    summaries: summarizeAudit(manuscript, claimAudits),
    claimAudits,
    reviewerTasks,
    citationInsertions: claimAudits.flatMap((claim) => claim.citationInsertions),
    releaseDecision: reviewerTasks.some((task) => task.type === "retracted-source-warning")
      ? "hold-for-review"
      : reviewerTasks.length > 0
        ? "revise-before-release"
        : "ready",
    requirementCoverage: {
      paperSummarizer: ["abstractStyle", "executiveSummary", "laypersonExplanation"],
      peerReviewAid: ["novelty-language-review", "retracted-source-warning", "rewrittenClaim"],
      citationTool: ["citationInsertions", "topMatches", "doi"]
    }
  };

  payload.auditDigest = crypto
    .createHash("sha256")
    .update(JSON.stringify({
      manuscriptId: payload.manuscriptId,
      claimAudits: payload.claimAudits,
      releaseDecision: payload.releaseDecision
    }))
    .digest("hex");

  return payload;
}

function generateSvgReport(audit) {
  const riskCounts = audit.claimAudits.reduce(
    (acc, claim) => {
      acc[claim.risk] += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 }
  );
  const bars = [
    ["High", riskCounts.high, "#be123c"],
    ["Medium", riskCounts.medium, "#b45309"],
    ["Low", riskCounts.low, "#15803d"]
  ];
  const barRows = bars.map(([label, count, color], index) => {
    const width = 46 + count * 96;
    const y = 178 + index * 58;
    return `
      <text x="64" y="${y + 22}" fill="#334155" font-size="22" font-weight="700">${label}</text>
      <rect x="190" y="${y}" width="${width}" height="34" rx="8" fill="${color}" opacity="0.88"/>
      <text x="${210 + width}" y="${y + 24}" fill="#0f172a" font-size="20" font-weight="700">${count}</text>
    `;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#f8fafc"/>
  <rect x="38" y="36" width="884" height="468" rx="22" fill="#ffffff" stroke="#dbe4ee"/>
  <text x="64" y="92" fill="#0f766e" font-family="Arial, sans-serif" font-size="18" font-weight="700">AI-ASSISTED RESEARCH TOOLS</text>
  <text x="64" y="132" fill="#0f172a" font-family="Arial, sans-serif" font-size="34" font-weight="800">Novelty Overlap Auditor</text>
  <text x="64" y="162" fill="#64748b" font-family="Arial, sans-serif" font-size="18">${escapeXml(audit.releaseDecision)} · ${audit.citationInsertions.length} citation insertions · digest ${audit.auditDigest.slice(0, 12)}</text>
  <g font-family="Arial, sans-serif">${barRows}</g>
  <rect x="64" y="390" width="832" height="74" rx="16" fill="#ecfdf5" stroke="#99f6e4"/>
  <text x="88" y="424" fill="#115e59" font-family="Arial, sans-serif" font-size="20" font-weight="700">Reviewer-safe action</text>
  <text x="88" y="450" fill="#334155" font-family="Arial, sans-serif" font-size="18">Soften absolute novelty claims and insert adjacent-work citations before peer review.</text>
</svg>`;
}

function writeDemoOutputs(audit, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "audit.json"), JSON.stringify(audit, null, 2) + "\n");
  fs.writeFileSync(path.join(outputDir, "novelty-overlap.svg"), generateSvgReport(audit));
  fs.writeFileSync(path.join(outputDir, "review-packet.md"), renderReviewPacket(audit));
}

function renderReviewPacket(audit) {
  const rows = audit.claimAudits.map((claim) => {
    const citations = claim.citationInsertions.map((item) => item.workId).join(", ") || "none";
    return `| ${claim.claimId} | ${claim.risk} | ${citations} | ${claim.rewrittenClaim} |`;
  }).join("\n");

  return `# Novelty Overlap Review Packet

Manuscript: ${audit.title}
Decision: ${audit.releaseDecision}
Digest: ${audit.auditDigest}

## Summaries

- Abstract: ${audit.summaries.abstractStyle}
- Executive: ${audit.summaries.executiveSummary}
- Layperson: ${audit.summaries.laypersonExplanation}

## Claim Actions

| Claim | Risk | Citation insertions | Reviewer-safe rewrite |
| --- | --- | --- | --- |
${rows}
`;
}

function round(value) {
  return Number(value.toFixed(3));
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  auditNoveltyOverlap,
  generateSvgReport,
  jaccard,
  scoreAdjacentWork,
  tokenize,
  usesNoveltyLanguage,
  writeDemoOutputs
};
