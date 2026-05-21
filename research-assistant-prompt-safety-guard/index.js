'use strict';

const DEFAULT_NOW = '2026-05-21T10:00:00.000Z';

const INJECTION_PATTERNS = [
  { id: 'ignore-prior', pattern: /\b(ignore|discard|forget)\s+(all\s+)?(previous|prior|above)\s+(instructions|rules|messages)\b/i, severity: 'blocker' },
  { id: 'system-prompt', pattern: /\b(system prompt|developer message|hidden instructions|chain of thought)\b/i, severity: 'blocker' },
  { id: 'tool-exfiltration', pattern: /\b(read|print|exfiltrate|upload|send)\s+(secrets?|tokens?|\.env|private keys?|credentials?)\b/i, severity: 'blocker' },
  { id: 'shell-or-network', pattern: /\b(run|execute)\s+(shell|bash|curl|wget|python|node)\b/i, severity: 'warning' },
  { id: 'reviewer-coercion', pattern: /\b(always accept|give a positive review|do not mention limitations|rate this paper highly)\b/i, severity: 'warning' }
];

const HIDDEN_TEXT_PATTERNS = [
  /<!--[\s\S]*?(ignore|system prompt|developer message|secret|credential)[\s\S]*?-->/i,
  /font-size\s*:\s*0/i,
  /color\s*:\s*(white|#fff|#ffffff)\s*;?\s*background\s*:\s*(white|#fff|#ffffff)/i,
  /display\s*:\s*none/i,
  /visibility\s*:\s*hidden/i
];

function asText(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value);
}

function tokenize(value) {
  return asText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 3);
}

function overlapScore(a, b) {
  const left = new Set(tokenize(a));
  const right = new Set(tokenize(b));
  if (left.size === 0 || right.size === 0) {
    return 0;
  }
  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) {
      overlap += 1;
    }
  }
  return overlap / Math.min(left.size, right.size);
}

function scanPromptInjection(text, sourceId) {
  const findings = [];
  for (const rule of INJECTION_PATTERNS) {
    const match = asText(text).match(rule.pattern);
    if (match) {
      findings.push({
        sourceId,
        ruleId: rule.id,
        severity: rule.severity,
        evidence: match[0],
        message: `possible prompt-injection instruction matched ${rule.id}`
      });
    }
  }
  for (const pattern of HIDDEN_TEXT_PATTERNS) {
    const match = asText(text).match(pattern);
    if (match) {
      findings.push({
        sourceId,
        ruleId: 'hidden-instruction-channel',
        severity: 'blocker',
        evidence: match[0].slice(0, 140),
        message: 'hidden or visually suppressed instruction channel detected'
      });
    }
  }
  return findings;
}

function buildEvidenceIndex(input) {
  const entries = [];
  for (const claim of input.manuscript.claims || []) {
    entries.push({
      id: claim.id,
      type: 'manuscript_claim',
      text: `${claim.text} ${(claim.evidenceIds || []).join(' ')}`
    });
  }
  for (const citation of input.corpus || []) {
    entries.push({
      id: citation.id,
      type: 'citation',
      text: `${citation.title || ''} ${citation.abstract || ''} ${(citation.topics || []).join(' ')}`
    });
  }
  for (const artifact of input.artifacts || []) {
    entries.push({
      id: artifact.id,
      type: 'artifact',
      text: `${artifact.name || ''} ${artifact.description || ''} ${(artifact.tags || []).join(' ')}`
    });
  }
  return entries;
}

function evaluateOutputFinding(finding, evidenceIndex, context) {
  const anchors = finding.evidenceIds || finding.citationIds || [];
  const missingAnchors = anchors.filter((id) => !evidenceIndex.some((entry) => entry.id === id));
  const supportingEntries = evidenceIndex.filter((entry) => anchors.includes(entry.id));
  const supportScore = Math.max(
    0,
    ...supportingEntries.map((entry) => overlapScore(`${finding.title || ''} ${finding.summary || ''}`, entry.text))
  );
  const blockers = [];
  const warnings = [];
  const actions = [];

  if (missingAnchors.length > 0) {
    blockers.push(`unknown evidence anchors: ${missingAnchors.join(', ')}`);
    actions.push('replace hallucinated anchors with verified manuscript, artifact, or citation ids');
  }

  if (anchors.length === 0) {
    blockers.push('finding has no evidence anchors');
    actions.push('attach at least one claim, artifact, or citation id before this review comment is shown');
  } else if (supportScore < context.minSupportScore && missingAnchors.length === 0) {
    warnings.push(`weak lexical support score ${supportScore.toFixed(2)}`);
    actions.push('route this finding to human review for support verification');
  }

  if (finding.recommendation && /\baccept\b/i.test(finding.recommendation) && blockers.length > 0) {
    blockers.push('acceptance recommendation conflicts with unresolved evidence blockers');
    actions.push('suppress accept/reject recommendation until blockers are resolved');
  }

  return {
    id: finding.id,
    title: finding.title,
    severity: finding.severity || 'medium',
    evidenceIds: anchors,
    supportScore: Math.round(supportScore * 100) / 100,
    blockers,
    warnings,
    actions
  };
}

function summarize(inputFindings, outputReviews) {
  const blockers = [];
  const warnings = [];
  const actions = [];

  for (const finding of inputFindings) {
    const item = {
      sourceId: finding.sourceId,
      message: finding.message,
      evidence: finding.evidence,
      ruleId: finding.ruleId
    };
    if (finding.severity === 'blocker') {
      blockers.push(item);
    } else {
      warnings.push(item);
    }
    actions.push({
      sourceId: finding.sourceId,
      action: `quarantine ${finding.sourceId} before assistant processing`
    });
  }

  for (const review of outputReviews) {
    for (const blocker of review.blockers) {
      blockers.push({
        sourceId: review.id,
        message: blocker,
        ruleId: 'unsupported-assistant-output'
      });
    }
    for (const warning of review.warnings) {
      warnings.push({
        sourceId: review.id,
        message: warning,
        ruleId: 'weak-evidence-support'
      });
    }
    for (const action of review.actions) {
      actions.push({
        sourceId: review.id,
        action
      });
    }
  }

  return {
    status: blockers.length > 0
      ? 'quarantine_assistant_packet'
      : warnings.length > 0
        ? 'requires_human_review'
        : 'assistant_packet_ready',
    blockers,
    warnings,
    actions
  };
}

function evaluateResearchAssistantSafety(input, options = {}) {
  const context = {
    now: options.now || input.generatedAt || DEFAULT_NOW,
    minSupportScore: options.minSupportScore || 0.18
  };
  const sourceTexts = [
    {
      id: input.manuscript.id,
      text: `${input.manuscript.title || ''}\n${input.manuscript.abstract || ''}\n${(input.manuscript.sections || []).join('\n')}`
    },
    ...(input.supplements || []).map((supplement) => ({
      id: supplement.id,
      text: `${supplement.name || ''}\n${supplement.content || ''}`
    }))
  ];

  const inputFindings = sourceTexts.flatMap((source) => scanPromptInjection(source.text, source.id));
  const evidenceIndex = buildEvidenceIndex(input);
  const outputReviews = (input.assistantOutput?.findings || []).map((finding) => (
    evaluateOutputFinding(finding, evidenceIndex, context)
  ));
  const summary = summarize(inputFindings, outputReviews);

  return {
    manuscriptId: input.manuscript.id,
    manuscriptTitle: input.manuscript.title,
    generatedAt: context.now,
    status: summary.status,
    summary,
    inputFindings,
    outputReviews,
    evidenceIndexSize: evidenceIndex.length
  };
}

function toMarkdownReport(result) {
  const lines = [
    '# Research Assistant Prompt Safety Guard Report',
    '',
    `Manuscript: ${result.manuscriptTitle} (${result.manuscriptId})`,
    `Status: ${result.status}`,
    `Generated: ${result.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Input injection findings: ${result.inputFindings.length}`,
    `- Assistant output findings reviewed: ${result.outputReviews.length}`,
    `- Evidence index entries: ${result.evidenceIndexSize}`,
    `- Blockers: ${result.summary.blockers.length}`,
    `- Warnings: ${result.summary.warnings.length}`,
    ''
  ];

  if (result.summary.blockers.length > 0) {
    lines.push('## Blockers', '');
    for (const blocker of result.summary.blockers) {
      lines.push(`- ${blocker.sourceId}: ${blocker.message} (${blocker.ruleId})`);
    }
    lines.push('');
  }

  if (result.summary.warnings.length > 0) {
    lines.push('## Warnings', '');
    for (const warning of result.summary.warnings) {
      lines.push(`- ${warning.sourceId}: ${warning.message} (${warning.ruleId})`);
    }
    lines.push('');
  }

  if (result.summary.actions.length > 0) {
    lines.push('## Required Actions', '');
    for (const action of result.summary.actions) {
      lines.push(`- ${action.sourceId}: ${action.action}`);
    }
    lines.push('');
  }

  lines.push('## Output Review Matrix', '');
  for (const review of result.outputReviews) {
    lines.push(`### ${review.title} (${review.id})`);
    lines.push(`- Support score: ${review.supportScore}`);
    lines.push(`- Evidence ids: ${review.evidenceIds.join(', ') || 'none'}`);
    lines.push(`- Blockers: ${review.blockers.length}`);
    lines.push(`- Warnings: ${review.warnings.length}`);
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function xmlEscape(value) {
  return asText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toSvgSummary(result) {
  const statusColor = result.status === 'assistant_packet_ready' ? '#0f766e' : '#b91c1c';
  const statusLabel = result.status === 'assistant_packet_ready' ? 'READY' : 'QUARANTINE';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-label="Research assistant prompt safety summary">
  <rect width="1280" height="720" fill="#111827"/>
  <rect x="72" y="72" width="1136" height="576" rx="24" fill="#f8fafc"/>
  <text x="112" y="138" font-family="Arial, sans-serif" font-size="36" font-weight="700" fill="#111827">Research Assistant Prompt Safety Guard</text>
  <text x="112" y="188" font-family="Arial, sans-serif" font-size="22" fill="#475569">${xmlEscape(result.manuscriptTitle)}</text>
  <rect x="112" y="232" width="260" height="120" rx="18" fill="${statusColor}"/>
  <text x="142" y="304" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#ffffff">${statusLabel}</text>
  <text x="112" y="416" font-family="Arial, sans-serif" font-size="28" fill="#111827">Blockers: ${result.summary.blockers.length}</text>
  <text x="112" y="466" font-family="Arial, sans-serif" font-size="28" fill="#111827">Warnings: ${result.summary.warnings.length}</text>
  <text x="112" y="516" font-family="Arial, sans-serif" font-size="28" fill="#111827">Assistant findings reviewed: ${result.outputReviews.length}</text>
  <text x="112" y="566" font-family="Arial, sans-serif" font-size="28" fill="#111827">Evidence entries indexed: ${result.evidenceIndexSize}</text>
  <text x="680" y="304" font-family="Arial, sans-serif" font-size="24" fill="#334155">Quarantines malicious manuscript instructions and unsupported AI-generated review claims before a reviewer packet is shown.</text>
</svg>
`;
}

module.exports = {
  evaluateResearchAssistantSafety,
  toMarkdownReport,
  toSvgSummary
};
