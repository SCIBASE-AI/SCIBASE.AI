const CURRENT_YEAR = 2026;

function tokens(value) {
  return new Set(String(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter(Boolean));
}

function overlap(a, b) {
  const left = tokens(a);
  const right = tokens(Array.isArray(b) ? b.join(" ") : b);
  if (left.size === 0) return 0;
  let hits = 0;
  for (const token of left) if (right.has(token)) hits += 1;
  return hits / left.size;
}

function evaluateRecommendation(item) {
  const contextOverlap = overlap(item.highlightedText, [...item.candidate.domains, ...item.candidate.claims]);
  const findings = [];

  if (!item.candidate.doi) findings.push("candidate citation is missing DOI metadata");
  if (item.candidate.contradictions.length > 0) findings.push(`candidate contradicts context: ${item.candidate.contradictions.join("; ")}`);
  if (contextOverlap < 0.18) findings.push(`low context overlap ${contextOverlap.toFixed(2)}`);
  if (item.intent !== "method-definition" && CURRENT_YEAR - item.candidate.year > 7) findings.push("candidate may be stale for applied domain support");
  if (item.intent === "strong-claim-support" && item.candidate.contradictions.length > 0) {
    findings.push("strong manuscript claim should be softened before citation insertion");
  }

  const decision = findings.length === 0 ? "insert-citation" : "hold-citation";
  const actions = decision === "insert-citation"
    ? ["insert citation", "record citation rationale"]
    : ["hold recommendation", "request closer supporting source", "show remediation note to author"];

  return {
    id: item.id,
    decision,
    title: item.candidate.title,
    doi: item.candidate.doi,
    contextOverlap: Number(contextOverlap.toFixed(3)),
    findings,
    actions
  };
}

function evaluateBatch(batch) {
  const recommendations = batch.recommendations.map(evaluateRecommendation);
  const summary = recommendations.reduce((acc, item) => {
    acc.total += 1;
    acc[item.decision] = (acc[item.decision] || 0) + 1;
    acc.findingCount += item.findings.length;
    return acc;
  }, { total: 0, findingCount: 0 });
  return { batchId: batch.id, generatedAt: batch.generatedAt, summary, recommendations };
}

module.exports = { evaluateRecommendation, evaluateBatch };
