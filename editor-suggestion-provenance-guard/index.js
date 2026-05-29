function evaluateSuggestion(suggestion) {
  const findings = [];

  if (suggestion.mode === "anonymous-review" && suggestion.authorVisible) {
    findings.push("anonymous review suggestion exposes author identity");
  }
  if (suggestion.targetRangeHash !== suggestion.currentRangeHash) {
    findings.push("suggestion target range is stale after document edits");
  }
  if (!["reviewer", "section-owner", "author"].includes(suggestion.permission)) {
    findings.push(`insufficient permission for tracked-change acceptance: ${suggestion.permission}`);
  }
  if (suggestion.acceptedBy && suggestion.lineage.length === 0) {
    findings.push("accepted suggestion is missing provenance lineage");
  }
  if (!suggestion.sectionId || !suggestion.documentId) {
    findings.push("suggestion is missing source document or section");
  }

  const decision = findings.length === 0 ? "accept-or-display" : "hold-suggestion";
  const actions = decision === "accept-or-display"
    ? ["preserve suggestion provenance", "allow tracked-change workflow"]
    : ["hold suggestion", "request provenance remediation", "prevent acceptance audit write"];

  return {
    id: suggestion.id,
    documentId: suggestion.documentId,
    sectionId: suggestion.sectionId,
    decision,
    findings,
    actions
  };
}

function evaluateBatch(batch) {
  const suggestions = batch.suggestions.map(evaluateSuggestion);
  const summary = suggestions.reduce((acc, suggestion) => {
    acc.total += 1;
    acc[suggestion.decision] = (acc[suggestion.decision] || 0) + 1;
    acc.findingCount += suggestion.findings.length;
    return acc;
  }, { total: 0, findingCount: 0 });

  return { batchId: batch.id, generatedAt: batch.generatedAt, summary, suggestions };
}

module.exports = { evaluateSuggestion, evaluateBatch };
