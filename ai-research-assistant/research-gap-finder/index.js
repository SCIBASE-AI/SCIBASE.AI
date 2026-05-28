"use strict";

const crypto = require("crypto");

const WEIGHTS = {
  lowStudyCount: 28,
  unresolvedQuestion: 18,
  lowReplication: 16,
  negativeSignal: 12,
  highMomentum: 10,
  labCapability: 8,
};

function normalizeTopic(topic) {
  return String(topic || "").trim().toLowerCase();
}

function topicKey(topics) {
  return [...new Set(topics.map(normalizeTopic).filter(Boolean))].sort().join(" + ");
}

function includesAll(recordTopics, candidateTopics) {
  const recordSet = new Set(recordTopics.map(normalizeTopic));
  return candidateTopics.every((topic) => recordSet.has(normalizeTopic(topic)));
}

function buildCandidateIntersections(corpus, options = {}) {
  const minSize = options.minIntersectionSize || 2;
  const maxSize = options.maxIntersectionSize || 3;
  const targetTopics = new Set((options.targetTopics || []).map(normalizeTopic));
  const candidates = new Map();

  for (const record of corpus.publications || []) {
    const topics = [...new Set((record.topics || []).map(normalizeTopic).filter(Boolean))];
    for (let size = minSize; size <= maxSize; size += 1) {
      for (const combo of combinations(topics, size)) {
        if (targetTopics.size && !combo.some((topic) => targetTopics.has(topic))) continue;
        const key = topicKey(combo);
        if (!candidates.has(key)) candidates.set(key, { topics: combo, records: [] });
        candidates.get(key).records.push(record);
      }
    }
  }

  return [...candidates.values()];
}

function combinations(items, size, start = 0, prefix = []) {
  if (prefix.length === size) return [prefix];
  const combos = [];
  for (let index = start; index < items.length; index += 1) {
    combos.push(...combinations(items, size, index + 1, [...prefix, items[index]]));
  }
  return combos;
}

function evaluateIntersection(candidate, corpus, options = {}) {
  const currentYear = options.currentYear || new Date().getFullYear();
  const matchingRecords = candidate.records;
  const recentRecords = matchingRecords.filter((record) => currentYear - record.year <= 3);
  const replicationRecords = matchingRecords.filter((record) => record.studyType === "replication");
  const negativeRecords = matchingRecords.filter((record) => record.resultDirection === "negative" || record.resultDirection === "mixed");
  const unresolvedQuestions = (corpus.openQuestions || []).filter((question) => includesAll(question.topics, candidate.topics));
  const labMatches = (corpus.labCapabilities || []).filter((capability) => includesAll(candidate.topics, capability.topics));
  const citationMomentum = matchingRecords.reduce((sum, record) => sum + (record.citationsLast24Months || 0), 0);
  const totalCitations = matchingRecords.reduce((sum, record) => sum + (record.citations || 0), 0);
  const independentLabs = new Set(matchingRecords.map((record) => record.lab).filter(Boolean));

  const studyCount = matchingRecords.length;
  const replicationRatio = studyCount ? replicationRecords.length / studyCount : 0;
  const unresolvedWeight = unresolvedQuestions.reduce((sum, question) => sum + (question.priority || 1), 0);
  const negativeWeight = negativeRecords.reduce((sum, record) => sum + (record.reliability || 1), 0);

  let score = 0;
  const reasons = [];

  if (studyCount <= (options.lowStudyThreshold || 3)) {
    score += WEIGHTS.lowStudyCount * (1 + Math.max(0, 3 - studyCount) * 0.2);
    reasons.push(`only ${studyCount} directly matched studies`);
  }
  if (unresolvedQuestions.length) {
    score += WEIGHTS.unresolvedQuestion * unresolvedWeight;
    reasons.push(`${unresolvedQuestions.length} unresolved question(s) map to the intersection`);
  }
  if (studyCount >= 2 && replicationRatio < 0.25) {
    score += WEIGHTS.lowReplication * (1 - replicationRatio);
    reasons.push(`replication ratio ${(replicationRatio * 100).toFixed(0)}%`);
  }
  if (negativeRecords.length) {
    score += WEIGHTS.negativeSignal * negativeWeight;
    reasons.push(`${negativeRecords.length} negative or mixed result(s) suggest follow-up`);
  }
  if (recentRecords.length && citationMomentum >= (options.highMomentumCitations || 30)) {
    score += WEIGHTS.highMomentum;
    reasons.push(`${citationMomentum} citations in the last 24 months`);
  }
  if (labMatches.length) {
    score += WEIGHTS.labCapability * Math.min(2, labMatches.length);
    reasons.push(`matched lab capability: ${labMatches.map((capability) => capability.name).join(", ")}`);
  }
  if (independentLabs.size <= 1 && studyCount > 1) {
    score += 8;
    reasons.push("evidence comes from a single lab cluster");
  }

  return {
    key: topicKey(candidate.topics),
    topics: candidate.topics,
    score: Number(score.toFixed(1)),
    studyCount,
    recentStudyCount: recentRecords.length,
    replicationCount: replicationRecords.length,
    replicationRatio: Number(replicationRatio.toFixed(2)),
    negativeOrMixedCount: negativeRecords.length,
    unresolvedQuestions: unresolvedQuestions.map((question) => ({
      id: question.id,
      text: question.text,
      priority: question.priority,
    })),
    labCapabilities: labMatches.map((capability) => capability.name),
    citationMomentum,
    totalCitations,
    independentLabs: independentLabs.size,
    reasons,
    recommendedNextStep: recommendNextStep({
      unresolvedQuestions,
      negativeRecords,
      replicationRatio,
      studyCount,
      labMatches,
    }),
  };
}

function recommendNextStep({ unresolvedQuestions, negativeRecords, replicationRatio, studyCount, labMatches }) {
  if (negativeRecords.length && labMatches.length) {
    return "Design a targeted replication or adjudication study using available lab capability.";
  }
  if (unresolvedQuestions.length && studyCount <= 2) {
    return "Create a seed grant or thesis prompt around the unresolved intersection.";
  }
  if (replicationRatio < 0.25) {
    return "Prioritize independent replication before expanding the claim area.";
  }
  return "Monitor literature and attach new evidence to the opportunity feed.";
}

function findResearchGaps(corpus, options = {}) {
  const candidates = buildCandidateIntersections(corpus, options)
    .map((candidate) => evaluateIntersection(candidate, corpus, options))
    .filter((candidate) => candidate.score >= (options.minScore || 25))
    .sort((left, right) => right.score - left.score || left.key.localeCompare(right.key))
    .slice(0, options.limit || 10);

  const digest = crypto
    .createHash("sha256")
    .update(JSON.stringify(candidates.map((candidate) => [candidate.key, candidate.score, candidate.studyCount])))
    .digest("hex")
    .slice(0, 16);

  return {
    corpus: {
      id: corpus.id,
      title: corpus.title,
      publications: (corpus.publications || []).length,
      openQuestions: (corpus.openQuestions || []).length,
      labCapabilities: (corpus.labCapabilities || []).length,
    },
    summary: {
      auditDigest: digest,
      opportunitiesFound: candidates.length,
      topScore: candidates[0]?.score || 0,
      targetTopics: options.targetTopics || [],
    },
    opportunities: candidates,
  };
}

function renderMarkdownReport(report) {
  const lines = [
    `# Research Gap Finder: ${report.corpus.title}`,
    "",
    `- Publications scanned: ${report.corpus.publications}`,
    `- Open questions scanned: ${report.corpus.openQuestions}`,
    `- Lab capabilities scanned: ${report.corpus.labCapabilities}`,
    `- Opportunities found: ${report.summary.opportunitiesFound}`,
    `- Audit digest: ${report.summary.auditDigest}`,
    "",
    "## Ranked Opportunities",
    "",
  ];

  for (const [index, opportunity] of report.opportunities.entries()) {
    lines.push(`### ${index + 1}. ${opportunity.key}`);
    lines.push(`- Score: ${opportunity.score}`);
    lines.push(`- Studies: ${opportunity.studyCount} (${opportunity.recentStudyCount} recent)`);
    lines.push(`- Replication ratio: ${Math.round(opportunity.replicationRatio * 100)}%`);
    lines.push(`- Citation momentum: ${opportunity.citationMomentum}`);
    lines.push(`- Next step: ${opportunity.recommendedNextStep}`);
    lines.push(`- Reasons: ${opportunity.reasons.join("; ")}`);
    if (opportunity.unresolvedQuestions.length) {
      lines.push(`- Unresolved: ${opportunity.unresolvedQuestions.map((question) => question.text).join(" | ")}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

module.exports = {
  findResearchGaps,
  renderMarkdownReport,
  buildCandidateIntersections,
  evaluateIntersection,
  topicKey,
};
