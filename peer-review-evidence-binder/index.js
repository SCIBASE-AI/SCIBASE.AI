const crypto = require('crypto');

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex').slice(0, 16);
}

function byId(items = []) {
  return new Map(items.map((item) => [item.id, item]));
}

function addFinding(findings, severity, code, message, evidence = {}) {
  findings.push({ severity, code, message, evidence });
}

function evidenceRank(strength) {
  return { none: 0, weak: 1, medium: 2, strong: 3 }[strength] || 0;
}

function severityRank(severity) {
  return { note: 0, low: 1, medium: 2, high: 3, critical: 4 }[severity] || 0;
}

function hasAccusationLanguage(text = '') {
  return /\b(fabricated|fraud|fraudulent|plagiarized|plagiarism|fake|dishonest|misconduct)\b/i.test(text);
}

function hasIdentityLeak(text = '') {
  return /reviewer\s*#?\d|reviewer email|@[\w.-]+\.\w+|dr\.\s+[a-z]+|prof\.\s+[a-z]+/i.test(text);
}

function evaluateReviewPacket(packet) {
  const findings = [];
  const artifacts = byId(packet.artifacts);
  const comments = packet.reviewComments || [];

  if (!packet.assistantRun?.model || !packet.assistantRun?.promptDigest) {
    addFinding(findings, 'medium', 'assistant_run_not_auditable', 'Assistant run metadata is missing model or prompt digest evidence.');
  }

  if (comments.length === 0) {
    addFinding(findings, 'high', 'missing_review_comments', 'AI review packet contains no generated review comments.');
  }

  for (const comment of comments) {
    validateEvidencePointers(comment, artifacts, findings);
    validateSeverityCalibration(comment, findings);
    validatePrivacy(comment, packet, findings);
    validateActionability(comment, findings);
  }

  const high = findings.filter((finding) => finding.severity === 'high').length;
  const medium = findings.filter((finding) => finding.severity === 'medium').length;
  const low = findings.filter((finding) => finding.severity === 'low').length;
  const decision = high > 0 ? 'hold' : medium > 0 ? 'revise' : 'release';

  return {
    packetId: packet.id,
    title: packet.title,
    decision,
    summary: { high, medium, low, total: findings.length },
    findings,
    releaseActions: buildReleaseActions(decision, findings),
    requirementMap: {
      autoPeerReview: 'AI-generated review comments are checked before release to authors',
      evidenceLinkedReports: 'Every finding must cite manuscript, table, figure, code, or data evidence',
      hallucinationControl: 'Unsupported accusations and missing evidence references force a hold',
      privacy: 'Blinded-review identity details and private reviewer notes are blocked',
      reviewerReadyArtifacts: 'Deterministic digests and reports make the review packet auditable'
    },
    auditDigest: digest({
      packet: packet.id,
      assistantRun: packet.assistantRun,
      comments,
      findings
    })
  };
}

function validateEvidencePointers(comment, artifacts, findings) {
  const refs = comment.evidenceRefs || [];
  if (refs.length === 0) {
    addFinding(findings, 'high', 'review_comment_missing_evidence', `${comment.id} has no manuscript or artifact evidence pointers.`, {
      commentId: comment.id
    });
    return;
  }

  for (const ref of refs) {
    const artifact = artifacts.get(ref.artifactId);
    if (!artifact) {
      addFinding(findings, 'high', 'evidence_artifact_missing', `${comment.id} references missing evidence artifact ${ref.artifactId}.`, {
        commentId: comment.id,
        artifactId: ref.artifactId
      });
      continue;
    }
    if (!ref.locator || !ref.quoteDigest) {
      addFinding(findings, 'medium', 'evidence_locator_incomplete', `${comment.id} has incomplete evidence locator metadata.`, {
        commentId: comment.id,
        artifactId: ref.artifactId
      });
    }
    if (comment.topic && Array.isArray(artifact.topics) && !artifact.topics.includes(comment.topic)) {
      addFinding(findings, 'medium', 'evidence_topic_mismatch', `${comment.id} cites evidence outside its stated topic.`, {
        commentId: comment.id,
        topic: comment.topic,
        artifactId: artifact.id,
        artifactTopics: artifact.topics
      });
    }
  }
}

function validateSeverityCalibration(comment, findings) {
  const refs = comment.evidenceRefs || [];
  const bestStrength = Math.max(0, ...refs.map((ref) => evidenceRank(ref.strength)));
  const rank = severityRank(comment.severity);

  if (rank >= severityRank('high') && bestStrength < evidenceRank('strong')) {
    addFinding(findings, 'high', 'severity_not_calibrated', `${comment.id} is high severity without strong evidence.`, {
      commentId: comment.id,
      severity: comment.severity,
      bestEvidenceStrength: bestStrength
    });
  }

  if (comment.kind === 'blocking' && Number(comment.confidence || 0) < 0.7) {
    addFinding(findings, 'medium', 'low_confidence_blocker', `${comment.id} blocks release with low assistant confidence.`, {
      commentId: comment.id,
      confidence: comment.confidence
    });
  }

  if (hasAccusationLanguage(comment.text) && bestStrength < evidenceRank('strong')) {
    addFinding(findings, 'high', 'unsupported_accusation_language', `${comment.id} uses accusation language without strong evidence.`, {
      commentId: comment.id
    });
  }
}

function validatePrivacy(comment, packet, findings) {
  if (comment.containsPrivateNote || comment.visibility === 'internal') {
    addFinding(findings, 'high', 'private_review_note_leak', `${comment.id} exposes internal review notes to the author-facing packet.`, {
      commentId: comment.id,
      visibility: comment.visibility
    });
  }

  if (packet.blindReview === true && (comment.mentionsReviewerIdentity || hasIdentityLeak(comment.text))) {
    addFinding(findings, 'high', 'blind_review_identity_leak', `${comment.id} leaks reviewer identity in a blinded review packet.`, {
      commentId: comment.id
    });
  }
}

function validateActionability(comment, findings) {
  const actions = comment.actionItems || [];
  if (actions.length === 0) {
    addFinding(findings, 'medium', 'missing_actionable_remediation', `${comment.id} does not give the author an actionable fix.`, {
      commentId: comment.id
    });
  }

  if (comment.text && comment.text.length < 40) {
    addFinding(findings, 'low', 'review_comment_too_thin', `${comment.id} is too terse for a reviewer-ready author comment.`, {
      commentId: comment.id
    });
  }
}

function buildReleaseActions(decision, findings) {
  if (decision === 'release') {
    return ['Release AI review packet to authors with audit digest attached.'];
  }
  const codes = [...new Set(findings.map((finding) => finding.code))];
  const actions = [];
  if (codes.includes('review_comment_missing_evidence') || codes.includes('evidence_artifact_missing')) {
    actions.push('Bind each review comment to concrete manuscript, figure, table, data, or code evidence.');
  }
  if (codes.includes('severity_not_calibrated') || codes.includes('unsupported_accusation_language')) {
    actions.push('Downgrade unsupported severity or add strong evidence before release.');
  }
  if (codes.includes('private_review_note_leak') || codes.includes('blind_review_identity_leak')) {
    actions.push('Redact private reviewer notes and identity details from author-visible output.');
  }
  if (codes.includes('missing_actionable_remediation')) {
    actions.push('Add author-facing remediation tasks for each critique.');
  }
  return actions;
}

function evaluatePackets(packets) {
  const reviews = packets.map(evaluateReviewPacket);
  return {
    generatedAt: new Date().toISOString(),
    overallDecision: reviews.some((review) => review.decision === 'hold')
      ? 'hold'
      : reviews.some((review) => review.decision === 'revise')
        ? 'revise'
        : 'release',
    reviews,
    packetDigest: digest(reviews)
  };
}

function formatMarkdown(packet) {
  const lines = [
    '# AI Peer Review Evidence Binder Report',
    '',
    `Generated: ${packet.generatedAt}`,
    `Overall decision: **${packet.overallDecision.toUpperCase()}**`,
    `Packet digest: \`${packet.packetDigest}\``,
    ''
  ];

  for (const review of packet.reviews) {
    lines.push(`## ${review.title}`);
    lines.push('');
    lines.push(`Decision: **${review.decision.toUpperCase()}**`);
    lines.push(`Audit digest: \`${review.auditDigest}\``);
    lines.push(`Findings: ${review.summary.total} (${review.summary.high} high, ${review.summary.medium} medium, ${review.summary.low} low)`);
    lines.push('');
    if (review.findings.length === 0) {
      lines.push('- No evidence-binder findings.');
    } else {
      for (const finding of review.findings) {
        lines.push(`- **${finding.severity.toUpperCase()}** \`${finding.code}\`: ${finding.message}`);
      }
    }
    lines.push('');
    lines.push('Release actions:');
    for (const action of review.releaseActions) {
      lines.push(`- ${action}`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatSvg(packet) {
  const width = 960;
  const rowHeight = 88;
  const height = 170 + packet.reviews.length * rowHeight;
  const rows = packet.reviews
    .map((review, index) => {
      const y = 132 + index * rowHeight;
      const color = review.decision === 'hold' ? '#dc2626' : review.decision === 'revise' ? '#ca8a04' : '#16a34a';
      return `
        <g transform="translate(48 ${y})">
          <rect width="864" height="66" rx="10" fill="#f8fafc" stroke="#cbd5e1"/>
          <circle cx="28" cy="33" r="14" fill="${color}"/>
          <text x="58" y="28" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#0f172a">${escapeXml(review.title)}</text>
          <text x="58" y="51" font-family="Arial, sans-serif" font-size="16" fill="#475569">${review.decision.toUpperCase()} - ${review.summary.total} findings - ${review.auditDigest}</text>
        </g>`;
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#ffffff"/>
    <text x="48" y="64" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#0f172a">AI Peer Review Evidence Binder</text>
    <text x="48" y="99" font-family="Arial, sans-serif" font-size="18" fill="#475569">Overall: ${packet.overallDecision.toUpperCase()} - packet ${packet.packetDigest}</text>
    ${rows}
  </svg>
`;
}

module.exports = {
  digest,
  evaluateReviewPacket,
  evaluatePackets,
  formatMarkdown,
  formatSvg,
  stableStringify
};
