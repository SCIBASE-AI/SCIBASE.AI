const fs = require('fs');
const path = require('path');

const MEDICAL_ADVICE_RE = /\b(ask your doctor to|stop taking|cure|guaranteed|safe for everyone|replace treatment|take this|prescribe)\b/i;
const CAUSAL_OVERSTATEMENT_RE = /\b(proves|will prevent|will cure|guarantees|eliminates|causes everyone|definitely|certainty)\b/i;
const BENEFIT_RE = /\b(cure|prevent|prevents|reduces|improves|saves|protects|treats|benefit|works)\b/i;
const UNCERTAINTY_RE = /\b(may|might|could|suggests|associated|limited|uncertain|early|small|preliminary|not yet known)\b/i;

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function splitSentences(text) {
  return String(text || '')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function countSyllables(word) {
  const cleaned = String(word || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!cleaned) return 0;
  const matches = cleaned.replace(/e$/, '').match(/[aeiouy]+/g);
  return Math.max(1, matches ? matches.length : 1);
}

function fleschKincaidGrade(text) {
  const sentences = Math.max(1, splitSentences(text).length);
  const words = tokenize(text);
  const wordCount = Math.max(1, words.length);
  const syllables = words.reduce((total, word) => total + countSyllables(word), 0);
  return Number((0.39 * (wordCount / sentences) + 11.8 * (syllables / wordCount) - 15.59).toFixed(1));
}

function evidenceCoverage(sentence, evidenceItems) {
  const words = new Set(tokenize(sentence).filter((word) => word.length > 3));
  let best = { id: null, score: 0, matchedTerms: [] };

  for (const item of evidenceItems) {
    const terms = new Set([...(item.terms || []), ...tokenize(item.text)].filter((term) => term.length > 3));
    const matchedTerms = [...words].filter((word) => terms.has(word));
    const score = terms.size === 0 ? 0 : matchedTerms.length / Math.min(words.size || 1, terms.size);
    if (score > best.score) {
      best = { id: item.id, score: Number(score.toFixed(2)), matchedTerms };
    }
  }

  return best;
}

function addFinding(findings, severity, code, message, evidence = {}) {
  findings.push({ severity, code, message, evidence });
}

function evaluateSummary(packet) {
  const evidenceItems = packet.sourceEvidence || [];
  const findings = [];
  const sentenceReports = [];
  const sentences = splitSentences(packet.summary);
  const grade = fleschKincaidGrade(packet.summary);
  const targetGrade = packet.audience?.maxGradeLevel || 8;

  if (grade > targetGrade) {
    addFinding(
      findings,
      'hold',
      'reading-level-too-high',
      `Lay summary reads at grade ${grade}, above the target grade ${targetGrade}.`,
      { grade, targetGrade },
    );
  }

  for (const jargon of packet.audience?.jargonTerms || []) {
    const regex = new RegExp(`\\b${escapeRegExp(jargon)}\\b`, 'i');
    if (regex.test(packet.summary)) {
      addFinding(findings, 'hold', 'jargon-not-explained', `Jargon term needs plain-language explanation: ${jargon}`, {
        term: jargon,
      });
    }
  }

  for (const sentence of sentences) {
    const coverage = evidenceCoverage(sentence, evidenceItems);
    const sentenceFindings = [];

    if (BENEFIT_RE.test(sentence) && coverage.score < 0.2) {
      sentenceFindings.push('benefit-claim-weakly-supported');
      addFinding(
        findings,
        'blocker',
        'benefit-claim-weakly-supported',
        'A public-facing benefit claim lacks enough source-evidence overlap.',
        { sentence, bestEvidence: coverage },
      );
    }

    if (CAUSAL_OVERSTATEMENT_RE.test(sentence)) {
      sentenceFindings.push('causal-overstatement');
      addFinding(
        findings,
        'blocker',
        'causal-overstatement',
        'Lay summary uses stronger causal wording than the evidence supports.',
        { sentence },
      );
    }

    if (MEDICAL_ADVICE_RE.test(sentence)) {
      sentenceFindings.push('medical-advice-risk');
      addFinding(
        findings,
        'blocker',
        'medical-advice-risk',
        'Lay summary risks sounding like clinical or medical advice.',
        { sentence },
      );
    }

    if (BENEFIT_RE.test(sentence) && !UNCERTAINTY_RE.test(sentence)) {
      sentenceFindings.push('uncertainty-missing');
      addFinding(
        findings,
        'hold',
        'uncertainty-missing',
        'Benefit-oriented sentence should preserve uncertainty for a public audience.',
        { sentence },
      );
    }

    sentenceReports.push({ sentence, bestEvidence: coverage, findings: sentenceFindings });
  }

  for (const required of packet.requiredLimitations || []) {
    const terms = tokenize(required);
    const summaryWords = new Set(tokenize(packet.summary));
    const matched = terms.filter((term) => summaryWords.has(term));
    if (matched.length < Math.min(2, terms.length)) {
      addFinding(findings, 'hold', 'required-limitation-missing', `Required limitation is missing: ${required}`, {
        limitation: required,
      });
    }
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker');
  const holds = findings.filter((finding) => finding.severity === 'hold');
  const decision = blockers.length ? 'block-public-share' : holds.length ? 'hold-for-rewrite' : 'approve-lay-summary';

  return {
    title: packet.title,
    audience: packet.audience,
    decision,
    shareable: decision === 'approve-lay-summary',
    summary: {
      sentences: sentences.length,
      readingGrade: grade,
      blockers: blockers.length,
      holds: holds.length,
      evidenceItems: evidenceItems.length,
    },
    findings,
    sentenceReports,
    rewriteActions: buildRewriteActions(findings),
  };
}

function buildRewriteActions(findings) {
  const actions = [];
  const has = (code) => findings.some((finding) => finding.code === code);

  if (has('benefit-claim-weakly-supported')) {
    actions.push('Remove or narrow unsupported benefit claims and attach a specific evidence span.');
  }
  if (has('causal-overstatement')) {
    actions.push('Replace causal verbs such as "proves" or "will prevent" with cautious language such as "suggests" or "may".');
  }
  if (has('medical-advice-risk')) {
    actions.push('Remove treatment instructions and add a human-clinician disclaimer when health content is present.');
  }
  if (has('uncertainty-missing')) {
    actions.push('Add uncertainty, study-size, and population context to benefit-oriented sentences.');
  }
  if (has('reading-level-too-high') || has('jargon-not-explained')) {
    actions.push('Rewrite with shorter sentences and define scientific terms in everyday language.');
  }
  if (has('required-limitation-missing')) {
    actions.push('Add the missing study limitations before the summary is shared with non-specialists.');
  }

  return actions;
}

function renderMarkdown(audit) {
  const lines = [
    '# Layperson Summary Safety Guard',
    '',
    `Title: ${audit.title}`,
    `Decision: ${audit.decision}`,
    `Audience: ${audit.audience?.name || 'public'}`,
    '',
    '## Summary',
    '',
    `- Sentences checked: ${audit.summary.sentences}`,
    `- Reading grade: ${audit.summary.readingGrade}`,
    `- Evidence items: ${audit.summary.evidenceItems}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Holds: ${audit.summary.holds}`,
    '',
    '## Findings',
    '',
  ];

  if (audit.findings.length === 0) {
    lines.push('No findings. The lay summary is ready for public sharing.');
  } else {
    for (const finding of audit.findings) {
      lines.push(`- ${finding.severity.toUpperCase()} ${finding.code}: ${finding.message}`);
    }
  }

  lines.push('', '## Rewrite Actions', '');
  for (const action of audit.rewriteActions) {
    lines.push(`- ${action}`);
  }

  lines.push('', '## Sentence Evidence Map', '');
  for (const report of audit.sentenceReports) {
    const evidence = report.bestEvidence.id || 'none';
    lines.push(`- ${report.findings.length ? 'REWRITE' : 'OK'} evidence=${evidence} score=${report.bestEvidence.score}: ${report.sentence}`);
  }

  return `${lines.join('\n')}\n`;
}

function renderSvg(audit) {
  const statusColor = audit.decision === 'approve-lay-summary' ? '#16a34a' : audit.decision === 'hold-for-rewrite' ? '#ca8a04' : '#dc2626';
  const rows = audit.findings.slice(0, 7).map((finding, index) => {
    const y = 188 + index * 36;
    const color = finding.severity === 'blocker' ? '#dc2626' : '#ca8a04';
    return `<text x="68" y="${y}" font-size="18" fill="${color}" font-weight="700">${finding.severity.toUpperCase()}</text><text x="184" y="${y}" font-size="18" fill="#0f172a">${escapeXml(finding.code)}</text>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#f8fafc"/>
  <rect x="32" y="28" width="896" height="96" rx="12" fill="#0f172a"/>
  <text x="64" y="72" font-size="30" fill="#f8fafc" font-family="Arial, sans-serif" font-weight="700">Layperson Summary Safety Guard</text>
  <text x="64" y="104" font-size="17" fill="#cbd5e1" font-family="Arial, sans-serif">${escapeXml(audit.title)}</text>
  <circle cx="760" cy="76" r="22" fill="${statusColor}"/>
  <text x="796" y="83" font-size="20" fill="#f8fafc" font-family="Arial, sans-serif" font-weight="700">${escapeXml(audit.decision)}</text>
  <text x="64" y="154" font-size="20" fill="#334155" font-family="Arial, sans-serif">Grade ${audit.summary.readingGrade}; ${audit.summary.blockers} blockers; ${audit.summary.holds} holds; ${audit.summary.evidenceItems} evidence items</text>
  ${rows}
  <rect x="32" y="470" width="896" height="42" rx="8" fill="#e2e8f0"/>
  <text x="64" y="497" font-size="18" fill="#334155" font-family="Arial, sans-serif">Blocks unsupported public claims before summaries are shared outside the research team.</text>
</svg>
`;
}

function writeReports(audit, outputDir = path.join(__dirname, 'reports')) {
  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, 'summary-safety-audit.json');
  const markdownPath = path.join(outputDir, 'rewrite-packet.md');
  const svgPath = path.join(outputDir, 'summary.svg');
  fs.writeFileSync(jsonPath, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(markdownPath, renderMarkdown(audit));
  fs.writeFileSync(svgPath, renderSvg(audit));
  return { jsonPath, markdownPath, svgPath };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = {
  tokenize,
  splitSentences,
  fleschKincaidGrade,
  evidenceCoverage,
  evaluateSummary,
  renderMarkdown,
  renderSvg,
  writeReports,
};
