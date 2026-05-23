const crypto = require('node:crypto');

const FORMAT_PATTERNS = {
  NCBIGene: /^\d+$/,
  UniProtKB: /^([OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9][A-Z][A-Z0-9]{2}[0-9])$/,
  PubChem: /^\d+$/,
  MeSH: /^D\d{6}$/,
};

const CRITICAL_FINDINGS = new Set([
  'invalid-accession-format',
  'duplicate-canonical-target',
]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function addFinding(findings, finding) {
  findings.push({
    severity: finding.severity || 'major',
    ...finding,
  });
}

function isValidFormat(node) {
  const pattern = FORMAT_PATTERNS[node.namespace];
  if (!pattern) return false;
  return pattern.test(String(node.accession || ''));
}

function evaluateNode(node, findings) {
  const hasValidFormat = isValidFormat(node);
  if (!hasValidFormat) {
    addFinding(findings, {
      type: 'invalid-accession-format',
      severity: 'critical',
      nodeId: node.id,
      namespace: node.namespace,
      accession: node.accession,
      message: `${node.namespace || 'unknown namespace'} accession ${node.accession || '<missing>'} does not match the namespace format.`,
      action: 'fix_accession_namespace',
    });
  }

  if (node.deprecatedAlias) {
    addFinding(findings, {
      type: 'deprecated-accession-alias',
      severity: 'major',
      nodeId: node.id,
      namespace: node.namespace,
      accession: node.accession,
      canonicalTarget: node.canonicalTarget,
      message: 'Node uses a deprecated alias that should be replaced by the canonical accession before graph publication.',
      action: 'replace_deprecated_alias',
    });
  }

  if (node.expectedTaxon && node.taxon && String(node.expectedTaxon) !== String(node.taxon)) {
    addFinding(findings, {
      type: 'taxon-mismatch',
      severity: 'major',
      nodeId: node.id,
      namespace: node.namespace,
      accession: node.accession,
      expectedTaxon: node.expectedTaxon,
      taxon: node.taxon,
      message: `Taxon ${node.taxon} does not match expected taxon ${node.expectedTaxon}.`,
      action: 'resolve_taxon_crosswalk',
    });
  }

  if (asArray(node.evidenceDois).length === 0) {
    addFinding(findings, {
      type: 'missing-doi-evidence',
      severity: 'major',
      nodeId: node.id,
      namespace: node.namespace,
      accession: node.accession,
      message: 'Crosswalk lacks DOI-backed evidence for the entity-page edge.',
      action: 'attach_doi_evidence',
    });
  }

  if (hasValidFormat && Number(node.crosswalkConfidence || 0) < 0.8) {
    addFinding(findings, {
      type: 'low-crosswalk-confidence',
      severity: 'major',
      nodeId: node.id,
      namespace: node.namespace,
      accession: node.accession,
      confidence: Number(node.crosswalkConfidence || 0),
      message: 'Crosswalk confidence is below the safe recommendation threshold.',
      action: 'raise_crosswalk_confidence',
    });
  }
}

function evaluateDuplicates(nodes, findings) {
  const byTarget = new Map();
  for (const node of nodes) {
    if (!node.canonicalTarget) continue;
    const list = byTarget.get(node.canonicalTarget) || [];
    list.push(node);
    byTarget.set(node.canonicalTarget, list);
  }

  for (const [canonicalTarget, list] of byTarget.entries()) {
    if (list.length < 2) continue;
    addFinding(findings, {
      type: 'duplicate-canonical-target',
      severity: 'critical',
      nodeId: list.map((node) => node.id).join(','),
      canonicalTarget,
      message: `Multiple graph nodes resolve to ${canonicalTarget}.`,
      action: 'merge_duplicate_canonical_nodes',
    });
  }
}

function addRecommendationSuppressions(nodes, findings) {
  const riskyNodeIds = new Set(findings.map((finding) => finding.nodeId).filter(Boolean));
  for (const node of nodes) {
    if (!node.usedInRecommendation || !riskyNodeIds.has(node.id)) continue;
    addFinding(findings, {
      type: 'unsafe-recommendation-crosswalk',
      severity: 'major',
      nodeId: node.id,
      namespace: node.namespace,
      accession: node.accession,
      message: 'Recommendation path uses a node with unresolved crosswalk findings.',
      action: 'suppress_unsafe_recommendation',
    });
  }
}

function summarize(nodes, findings) {
  return {
    nodeCount: nodes.length,
    formatIssues: findings.filter((finding) => finding.type === 'invalid-accession-format').length,
    duplicateTargets: findings.filter((finding) => finding.type === 'duplicate-canonical-target').length,
    aliasIssues: findings.filter((finding) => finding.type === 'deprecated-accession-alias').length,
    taxonIssues: findings.filter((finding) => finding.type === 'taxon-mismatch').length,
    evidenceIssues: findings.filter((finding) => finding.type === 'missing-doi-evidence' || finding.type === 'low-crosswalk-confidence').length,
    recommendationSuppressions: findings.filter((finding) => finding.type === 'unsafe-recommendation-crosswalk').length,
  };
}

function chooseDecision(findings) {
  if (findings.some((finding) => CRITICAL_FINDINGS.has(finding.type))) {
    return 'hold-for-curation';
  }
  if (findings.length > 0) {
    return 'needs-curator-review';
  }
  return 'approved';
}

function calculateReadinessScore(findings) {
  const score = findings.reduce((total, finding) => {
    if (finding.severity === 'critical') return total - 25;
    if (finding.severity === 'major') return total - 15;
    return total - 8;
  }, 100);
  return Math.max(0, score);
}

function actionMessage(finding) {
  const messages = {
    fix_accession_namespace: 'Correct the accession namespace or replace the node with a valid identifier.',
    merge_duplicate_canonical_nodes: 'Merge duplicate canonical nodes and preserve edge provenance.',
    replace_deprecated_alias: 'Replace deprecated aliases with the current canonical accession.',
    resolve_taxon_crosswalk: 'Resolve taxon mismatch before recommendations use this node.',
    attach_doi_evidence: 'Attach DOI-backed evidence for the crosswalk edge.',
    raise_crosswalk_confidence: 'Add stronger evidence or curator approval to raise crosswalk confidence.',
    suppress_unsafe_recommendation: 'Suppress recommendations using unresolved crosswalk nodes.',
  };
  return messages[finding.action] || finding.message;
}

function buildRequiredActions(findings) {
  const seen = new Set();
  return findings
    .map((finding) => ({
      type: finding.action,
      nodeId: finding.nodeId,
      findingType: finding.type,
      message: actionMessage(finding),
    }))
    .filter((action) => {
      const key = `${action.type}:${action.nodeId}:${action.findingType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function buildDigest(input) {
  return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex').slice(0, 16);
}

function evaluateBiologicalAccessionCrosswalk(packet) {
  const nodes = asArray(packet.nodes);
  const findings = [];
  for (const node of nodes) {
    evaluateNode(node, findings);
  }
  evaluateDuplicates(nodes, findings);
  addRecommendationSuppressions(nodes, findings);

  const summary = summarize(nodes, findings);
  const decision = chooseDecision(findings);
  const readinessScore = decision === 'approved' ? 100 : calculateReadinessScore(findings);

  return {
    graphId: packet.graphId || 'unknown-graph',
    generatedAt: packet.generatedAt || new Date().toISOString(),
    decision,
    readinessScore,
    summary,
    findings,
    requiredActions: buildRequiredActions(findings),
    auditDigest: buildDigest({nodes, findings, summary, decision}),
  };
}

function buildReviewerPacket(result) {
  const lines = [
    '# Biological Accession Crosswalk Guard Report',
    '',
    `Graph: ${result.graphId}`,
    `Generated: ${result.generatedAt}`,
    `Decision: ${result.decision}`,
    `Readiness score: ${result.readinessScore}`,
    `Findings: ${result.findings.length}`,
    `Audit digest: ${result.auditDigest}`,
    '',
    '## Summary',
    '',
    `- Nodes reviewed: ${result.summary.nodeCount}`,
    `- Format issues: ${result.summary.formatIssues}`,
    `- Duplicate targets: ${result.summary.duplicateTargets}`,
    `- Alias issues: ${result.summary.aliasIssues}`,
    `- Taxon issues: ${result.summary.taxonIssues}`,
    `- Evidence issues: ${result.summary.evidenceIssues}`,
    `- Recommendation suppressions: ${result.summary.recommendationSuppressions}`,
    '',
    '## Findings',
    '',
  ];

  if (result.findings.length === 0) {
    lines.push('- No biological accession crosswalk findings.');
  } else {
    for (const finding of result.findings) {
      lines.push(`- ${finding.severity.toUpperCase()} ${finding.type} for ${finding.nodeId}: ${finding.message}`);
    }
  }

  lines.push('', '## Required Actions', '');
  if (result.requiredActions.length === 0) {
    lines.push('- No curator action required.');
  } else {
    for (const action of result.requiredActions) {
      lines.push(`- ${action.type} (${action.nodeId}): ${action.message}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

module.exports = {
  evaluateBiologicalAccessionCrosswalk,
  buildReviewerPacket,
};
