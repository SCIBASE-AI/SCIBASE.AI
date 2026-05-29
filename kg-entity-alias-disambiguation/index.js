const BLOCK_MARGIN = 0.05;
const SAFE_SCORE = 0.86;

function tokenize(value) {
  return new Set(String(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean));
}

function overlapScore(context, label) {
  const contextTokens = tokenize(context);
  const labelTokens = [...tokenize(label)];
  if (labelTokens.length === 0) return 0;
  const hits = labelTokens.filter((token) => contextTokens.has(token)).length;
  return hits / labelTokens.length;
}

function evaluateMention(mention) {
  const ranked = mention.candidates
    .map((candidate) => ({
      ...candidate,
      contextOverlap: overlapScore(mention.context, candidate.label),
      adjustedScore: Number((candidate.score + overlapScore(mention.context, candidate.label) * 0.12).toFixed(3))
    }))
    .sort((a, b) => b.adjustedScore - a.adjustedScore);

  const [best, runnerUp] = ranked;
  const margin = runnerUp ? Number((best.adjustedScore - runnerUp.adjustedScore).toFixed(3)) : best.adjustedScore;
  const findings = [];

  if (runnerUp && margin < BLOCK_MARGIN) {
    findings.push(`candidate margin ${margin} is below ${BLOCK_MARGIN}`);
  }
  if (best.adjustedScore < SAFE_SCORE) {
    findings.push(`best adjusted score ${best.adjustedScore} is below ${SAFE_SCORE}`);
  }
  if (mention.proposedEdges.length > 1 && runnerUp && margin < 0.1) {
    findings.push("multiple ontology edges proposed for an ambiguous mention");
  }

  const decision = findings.length > 0 ? "hold-for-curation" : "publish-canonical-node";
  const actions = decision === "publish-canonical-node"
    ? [`merge mention into ${best.id}`, "publish proposed graph edge"]
    : ["block graph edge publication", "route mention to ontology curator", `keep candidate ${best.id} as provisional`];

  return {
    mention: mention.mention,
    source: mention.source,
    doi: mention.doi,
    decision,
    canonicalCandidate: best.id,
    canonicalLabel: best.label,
    margin,
    rankedCandidates: ranked,
    findings,
    actions
  };
}

function evaluateBatch(batch) {
  const mentions = batch.candidates.map(evaluateMention);
  const summary = mentions.reduce(
    (acc, mention) => {
      acc.total += 1;
      acc[mention.decision] = (acc[mention.decision] || 0) + 1;
      acc.findingCount += mention.findings.length;
      return acc;
    },
    { total: 0, findingCount: 0 }
  );

  return {
    batchId: batch.id,
    generatedAt: batch.generatedAt,
    summary,
    mentions
  };
}

module.exports = { BLOCK_MARGIN, SAFE_SCORE, evaluateMention, evaluateBatch };
