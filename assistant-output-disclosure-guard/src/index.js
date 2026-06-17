'use strict';

const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_POLICY = Object.freeze({
  embargoBufferDays: 0,
  unsupportedClaimVerbs: ['proves', 'cures', 'guarantees', 'eliminates'],
  restrictedAudienceRequiresApproval: true
});

const SEVERITY_RANK = Object.freeze({
  RELEASE_OUTPUT: 0,
  REVIEW_BEFORE_RELEASE: 1,
  HOLD_OUTPUT: 2
});

const DIRECT_IDENTIFIER_PATTERNS = Object.freeze([
  { code: 'EMAIL_ADDRESS', pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { code: 'MEDICAL_RECORD_NUMBER', pattern: /\b(?:MRN|patient|participant)[-_\s#:]*[A-Z0-9-]{3,}\b/i },
  { code: 'PRIVATE_STORAGE_LINK', pattern: /\b(?:s3|gs|az|file):\/\/[^\s)]+/i },
  { code: 'INTERNAL_TOKEN_REFERENCE', pattern: /\b(?:token|secret|api[_-]?key)\b/i }
]);

const PROMPT_LEAK_PATTERNS = Object.freeze([
  /\bhidden system prompt\b/i,
  /\bdeveloper message\b/i,
  /\bsystem instructions?\b/i,
  /\bignore previous instructions\b/i
]);

function parseDate(value, fieldName) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date for ${fieldName}: ${value}`);
  return date;
}

function daysUntil(date, asOf) {
  return Math.ceil((date.getTime() - asOf.getTime()) / DAY_MS);
}

function classify(current, incoming) {
  return SEVERITY_RANK[incoming] > SEVERITY_RANK[current] ? incoming : current;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function sentenceHasCitationSupport(sentence, citations) {
  const lower = sentence.toLowerCase();
  return (citations || []).some((citation) =>
    (citation.supports || []).some((support) => lower.includes(String(support).toLowerCase()))
  );
}

function findUnsupportedClaims(text, citations, verbs) {
  const sentences = String(text)
    .split(/[.!?]\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences.filter((sentence) => {
    const hasRiskVerb = verbs.some((verb) =>
      new RegExp(`\\b${verb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(sentence)
    );
    return hasRiskVerb && !sentenceHasCitationSupport(sentence, citations);
  });
}

function evaluatePacket(packet, options = {}) {
  const policy = { ...DEFAULT_POLICY, ...(options.policy || {}) };
  const asOf = parseDate(options.asOf, 'asOf') || new Date();
  const evidence = packet.evidence || {};
  const text = String(packet.generatedText || '');
  let decision = 'RELEASE_OUTPUT';
  const reasons = [];
  const actions = [];

  function add(severity, code, message, action) {
    decision = classify(decision, severity);
    reasons.push({ severity, code, message });
    if (action) actions.push(action);
  }

  for (const rule of DIRECT_IDENTIFIER_PATTERNS) {
    if (rule.pattern.test(text)) {
      const severity =
        rule.code === 'PRIVATE_STORAGE_LINK' || rule.code === 'INTERNAL_TOKEN_REFERENCE'
          ? 'HOLD_OUTPUT'
          : 'HOLD_OUTPUT';
      add(
        severity,
        rule.code,
        `Generated text matches ${rule.code.toLowerCase().replace(/_/g, ' ')} pattern.`,
        'Redact direct identifiers and rerun disclosure review before release.'
      );
    }
  }

  if (PROMPT_LEAK_PATTERNS.some((pattern) => pattern.test(text))) {
    add(
      'HOLD_OUTPUT',
      'PROMPT_OR_INSTRUCTION_LEAK',
      'Generated text appears to expose prompt, system, or instruction content.',
      'Suppress output and inspect the assistant prompt chain.'
    );
  }

  const embargoUntil = parseDate(packet.embargoUntil, 'embargoUntil');
  if (embargoUntil && packet.visibility === 'public') {
    const remainingDays = daysUntil(embargoUntil, asOf);
    if (remainingDays > policy.embargoBufferDays) {
      add(
        'HOLD_OUTPUT',
        'EMBARGOED_PUBLIC_OUTPUT',
        `Output is public while project remains embargoed for ${remainingDays} days.`,
        'Keep assistant output private until the embargo expires.'
      );
    }
  }

  if (packet.doubleBlind && /\b(?:reviewer|dr\.|professor)\s+[A-Z][a-z]+/i.test(text)) {
    add(
      'HOLD_OUTPUT',
      'DOUBLE_BLIND_IDENTITY_LEAK',
      'Double-blind output appears to reveal reviewer identity.',
      'Replace reviewer names with role-neutral labels before release.'
    );
  }

  if (
    policy.restrictedAudienceRequiresApproval &&
    packet.classification === 'restricted' &&
    !evidence.humanApproval
  ) {
    add(
      'HOLD_OUTPUT',
      'RESTRICTED_OUTPUT_LACKS_APPROVAL',
      'Restricted assistant output has no human approval evidence.',
      'Attach human approval before releasing restricted output.'
    );
  }

  if (evidence.redactionReview !== 'passed') {
    add(
      packet.classification === 'restricted' ? 'HOLD_OUTPUT' : 'REVIEW_BEFORE_RELEASE',
      'REDACTION_REVIEW_MISSING',
      'No passed redaction review is attached.',
      'Run and attach redaction review evidence.'
    );
  }

  if (!evidence.deidentificationSummary) {
    add(
      'REVIEW_BEFORE_RELEASE',
      'DEIDENTIFICATION_SUMMARY_MISSING',
      'No de-identification summary is attached.',
      'Add a de-identification summary for reviewer replay.'
    );
  }

  if (packet.classification === 'restricted' && !evidence.dataUseAgreement) {
    add(
      'HOLD_OUTPUT',
      'DATA_USE_EVIDENCE_MISSING',
      'Restricted assistant output lacks data-use evidence.',
      'Attach data-use agreement or mark the output non-releasable.'
    );
  }

  const unsupportedClaims = findUnsupportedClaims(
    text,
    packet.citations,
    policy.unsupportedClaimVerbs
  );
  if (unsupportedClaims.length > 0) {
    add(
      'REVIEW_BEFORE_RELEASE',
      'UNSUPPORTED_HIGH_IMPACT_CLAIM',
      `Found ${unsupportedClaims.length} high-impact claim(s) without source support.`,
      'Rewrite claims with source support or downgrade the language.'
    );
  }

  const sortedReasons = reasons.sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || a.code.localeCompare(b.code)
  );

  return {
    packetId: packet.id,
    title: packet.title,
    assistantMode: packet.assistantMode,
    visibility: packet.visibility,
    audience: packet.audience,
    decision,
    disclosureSignals: {
      directIdentifierMatches: DIRECT_IDENTIFIER_PATTERNS.filter((rule) => rule.pattern.test(text)).map(
        (rule) => rule.code
      ),
      promptLeak: PROMPT_LEAK_PATTERNS.some((pattern) => pattern.test(text)),
      unsupportedClaimCount: unsupportedClaims.length,
      citationCount: (packet.citations || []).length
    },
    evidence: {
      humanApproval: evidence.humanApproval || null,
      redactionReview: evidence.redactionReview || null,
      deidentificationSummary: evidence.deidentificationSummary || null,
      dataUseAgreement: evidence.dataUseAgreement || null
    },
    reasons: sortedReasons,
    actions: unique(actions),
    riskScore: sortedReasons.reduce((total, reason) => total + SEVERITY_RANK[reason.severity], 0)
  };
}

function evaluateSuite(packet, options = {}) {
  const asOf = options.asOf || packet.asOf;
  const policy = { ...DEFAULT_POLICY, ...(packet.policy || {}), ...(options.policy || {}) };
  const results = (packet.packets || []).map((entry) => evaluatePacket(entry, { asOf, policy }));
  return {
    asOf,
    policy,
    summary: summarizeResults(results),
    results
  };
}

function summarizeResults(results) {
  const summary = {
    totalPackets: results.length,
    release: 0,
    review: 0,
    hold: 0,
    heldPacketIds: [],
    reviewPacketIds: [],
    topRisks: []
  };

  for (const result of results) {
    if (result.decision === 'RELEASE_OUTPUT') summary.release += 1;
    if (result.decision === 'REVIEW_BEFORE_RELEASE') {
      summary.review += 1;
      summary.reviewPacketIds.push(result.packetId);
    }
    if (result.decision === 'HOLD_OUTPUT') {
      summary.hold += 1;
      summary.heldPacketIds.push(result.packetId);
    }
  }

  summary.topRisks = results
    .flatMap((result) =>
      result.reasons.map((reason) => ({
        packetId: result.packetId,
        severity: reason.severity,
        code: reason.code
      }))
    )
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])
    .slice(0, 8);

  return summary;
}

function buildMarkdownReport(suite) {
  const lines = [
    '# Assistant Output Disclosure Report',
    '',
    `As of: ${suite.asOf}`,
    '',
    '## Summary',
    '',
    `- Total packets: ${suite.summary.totalPackets}`,
    `- Release: ${suite.summary.release}`,
    `- Review: ${suite.summary.review}`,
    `- Hold: ${suite.summary.hold}`,
    '',
    '## Packet Decisions',
    '',
    '| Packet | Mode | Visibility | Decision | Primary reason |',
    '| --- | --- | --- | --- | --- |'
  ];

  for (const result of suite.results) {
    const primary = result.reasons[0]
      ? `${result.reasons[0].code}: ${result.reasons[0].message}`
      : 'All disclosure checks passed';
    lines.push(
      `| ${result.title} | ${result.assistantMode} | ${result.visibility} | ${result.decision} | ${primary} |`
    );
  }

  lines.push('', '## Remediation Actions', '');
  for (const result of suite.results) {
    lines.push(`### ${result.title}`);
    if (result.actions.length === 0) {
      lines.push('- Release assistant output to the configured audience.');
    } else {
      for (const action of result.actions) lines.push(`- ${action}`);
    }
    lines.push('');
  }

  while (lines[lines.length - 1] === '') lines.pop();
  return `${lines.join('\n')}\n`;
}

function buildSvgSummary(suite) {
  const width = 860;
  const height = 360;
  const releaseWidth = suite.summary.release * 90;
  const reviewWidth = suite.summary.review * 90;
  const holdWidth = suite.summary.hold * 90;
  const escape = (value) =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const rows = suite.results
    .map((result, index) => {
      const y = 176 + index * 30;
      const color =
        result.decision === 'HOLD_OUTPUT'
          ? '#c2410c'
          : result.decision === 'REVIEW_BEFORE_RELEASE'
            ? '#a16207'
            : '#15803d';
      return `<text x="42" y="${y}" font-size="14" fill="#111827">${escape(result.title)}</text><text x="560" y="${y}" font-size="14" fill="${color}" font-weight="700">${result.decision}</text>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">Assistant output disclosure guard summary</title>
  <desc id="desc">Release, review, and hold counts for synthetic AI research assistant outputs.</desc>
  <rect width="860" height="360" fill="#f8fafc"/>
  <text x="40" y="48" font-size="28" font-family="Arial, sans-serif" font-weight="700" fill="#111827">Assistant Output Disclosure Guard</text>
  <text x="40" y="78" font-size="15" font-family="Arial, sans-serif" fill="#475569">Synthetic reviewer packet for AI-Powered Research Assistant issue #16</text>
  <rect x="40" y="108" width="${releaseWidth}" height="28" rx="4" fill="#16a34a"/>
  <rect x="${40 + releaseWidth}" y="108" width="${reviewWidth}" height="28" rx="4" fill="#ca8a04"/>
  <rect x="${40 + releaseWidth + reviewWidth}" y="108" width="${holdWidth}" height="28" rx="4" fill="#ea580c"/>
  <text x="40" y="156" font-size="13" font-family="Arial, sans-serif" fill="#111827">Release: ${suite.summary.release} | Review: ${suite.summary.review} | Hold: ${suite.summary.hold}</text>
  ${rows}
</svg>
`;
}

module.exports = {
  DEFAULT_POLICY,
  buildMarkdownReport,
  buildSvgSummary,
  evaluatePacket,
  evaluateSuite,
  summarizeResults
};
