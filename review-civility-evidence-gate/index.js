const fs = require("fs");
const path = require("path");

const DEFAULT_POLICY = {
  severityHoldThreshold: 2,
  evidenceRequiredForScoresAtOrBelow: 2,
  minimumActionableCharacters: 48,
  repeatedCommentLimit: 2,
  toxicTerms: [
    "fraud",
    "fake scientist",
    "fabricator",
    "liar",
    "stupid",
    "idiot",
    "incompetent",
    "should be fired",
    "career is over",
    "worthless",
    "trash work"
  ],
  identityDisclosureTerms: [
    "home address",
    "phone number",
    "personal email",
    "real name is",
    "legal name",
    "visa status",
    "medical condition",
    "religion",
    "caste",
    "salary",
    "family member"
  ],
  evidencePattern:
    "(doi:|https?://|commit\\s+[0-9a-f]{7,40}|line\\s*[0-9]+|fig\\.\\s*[0-9a-z.-]+|figure\\s*[0-9]+[0-9a-z.-]*|table\\s*[0-9]+[0-9a-z.-]*|dataset\\s*(?:#|:)\\s*[0-9a-z][0-9a-z._-]*|notebook\\s*(?:#|:)\\s*[0-9a-z][0-9a-z._-]*|cell\\s*[a-z]?[0-9]+|protocol\\s*(?:#|:)\\s*[0-9a-z][0-9a-z._-]*|section\\s*[0-9]+[0-9a-z._-]*|artifact\\s*(?:#|:)\\s*[0-9a-z][0-9a-z._-]*)"
};

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function lowerText(value) {
  return normalizeText(value).toLowerCase();
}

function createIssue(kind, severity, itemId, message, evidence = {}) {
  return {
    kind,
    severity,
    itemId,
    message,
    evidence
  };
}

function containsAny(text, terms) {
  const normalized = lowerText(text);
  return terms
    .filter((term) => normalized.includes(lowerText(term)))
    .map((term) => term.toLowerCase());
}

function hasEvidenceAnchor(text, policy) {
  const pattern = new RegExp(policy.evidencePattern, "i");
  return pattern.test(text || "");
}

function reviewerIdentityHints(review) {
  const text = lowerText([review.title, review.summary, review.body, review.recommendation].join(" "));
  const hints = [];
  const reviewer = review.reviewer || {};
  const candidates = [
    reviewer.displayName,
    reviewer.handle,
    reviewer.email,
    reviewer.institution,
    reviewer.orcid
  ].filter(Boolean);

  for (const candidate of candidates) {
    const token = lowerText(candidate);
    if (token.length >= 4 && text.includes(token)) {
      hints.push(candidate);
    }
  }

  if (/\b(i am|this is|as)\s+(dr\.|prof\.|professor|reviewer)\b/i.test(text)) {
    hints.push("self-identifying phrase");
  }

  return [...new Set(hints)];
}

function scoreEntries(review) {
  return Object.entries(review.scores || {})
    .filter(([, value]) => Number.isFinite(Number(value)))
    .map(([name, value]) => ({ name, value: Number(value) }));
}

function evaluateReview(review, policy) {
  const id = review.id || "review";
  const text = normalizeText([review.title, review.summary, review.body, review.recommendation].join(" "));
  const issues = [];
  const warnings = [];
  const redactions = [];
  const evidenceAnchored = hasEvidenceAnchor(text, policy);

  const toxicHits = containsAny(text, policy.toxicTerms);
  if (toxicHits.length) {
    issues.push(
      createIssue("harassment_or_personal_attack", "blocker", id, "Review contains language that should be held before publication.", {
        terms: toxicHits
      })
    );
  }

  const identityHits = containsAny(text, policy.identityDisclosureTerms);
  if (identityHits.length) {
    issues.push(
      createIssue("protected_identity_disclosure", "blocker", id, "Review appears to disclose personal or protected identity information.", {
        terms: identityHits
      })
    );
    redactions.push({ itemId: id, terms: identityHits });
  }

  if (["anonymous", "blind", "double_blind"].includes(lowerText(review.mode))) {
    const hints = reviewerIdentityHints(review);
    if (hints.length) {
      issues.push(
        createIssue("anonymous_reviewer_identity_leak", "blocker", id, "Anonymous review text appears to reveal reviewer identity.", {
          hints
        })
      );
      redactions.push({ itemId: id, terms: hints });
    }
  }

  const severeScores = scoreEntries(review).filter((score) => score.value <= policy.evidenceRequiredForScoresAtOrBelow);
  if (severeScores.length && !evidenceAnchored) {
    issues.push(
      createIssue("unsupported_reputation_damaging_score", "blocker", id, "Low structured scores must cite evidence before affecting public reputation.", {
        scores: severeScores
      })
    );
  }

  if (text.length < policy.minimumActionableCharacters) {
    warnings.push(
      createIssue("low_actionability", "warning", id, "Review is too short to carry reputation weight without moderator confirmation.", {
        characters: text.length
      })
    );
  }

  return {
    id,
    type: "review",
    mode: review.mode || "public",
    evidenceAnchored,
    issues,
    warnings,
    redactions,
    allowProfileImpact: issues.length === 0
  };
}

function evaluateComment(comment, policy, seenTexts) {
  const id = comment.id || "comment";
  const text = normalizeText(comment.body);
  const issues = [];
  const warnings = [];
  const redactions = [];

  const toxicHits = containsAny(text, policy.toxicTerms);
  if (toxicHits.length) {
    issues.push(
      createIssue("harassment_or_personal_attack", "blocker", id, "Inline comment contains language that should be held before publication.", {
        terms: toxicHits
      })
    );
  }

  const identityHits = containsAny(text, policy.identityDisclosureTerms);
  if (identityHits.length) {
    issues.push(
      createIssue("protected_identity_disclosure", "blocker", id, "Inline comment may expose personal or protected identity information.", {
        terms: identityHits
      })
    );
    redactions.push({ itemId: id, terms: identityHits });
  }

  if (!comment.anchor || !comment.anchor.artifactId) {
    warnings.push(createIssue("missing_inline_anchor", "warning", id, "Inline comments need an artifact anchor for project timelines.", {}));
  }

  const repeatedCount = (seenTexts.get(lowerText(text)) || 0) + 1;
  seenTexts.set(lowerText(text), repeatedCount);
  if (repeatedCount > policy.repeatedCommentLimit) {
    warnings.push(
      createIssue("repeated_comment", "warning", id, "Repeated comments should be collapsed before they influence reputation.", {
        repeatedCount
      })
    );
  }

  return {
    id,
    type: "comment",
    anchor: comment.anchor || null,
    issues,
    warnings,
    redactions,
    allowTimelinePublication: issues.length === 0
  };
}

function evaluateReviewCivility(packet, policyOverrides = {}) {
  const policy = { ...DEFAULT_POLICY, ...(packet.policy || {}), ...policyOverrides };
  const reviews = Array.isArray(packet.reviews) ? packet.reviews : [];
  const comments = Array.isArray(packet.comments) ? packet.comments : [];
  const seenCommentTexts = new Map();
  const decisions = [
    ...reviews.map((review) => evaluateReview(review, policy)),
    ...comments.map((comment) => evaluateComment(comment, policy, seenCommentTexts))
  ];

  const blockers = decisions.flatMap((decision) => decision.issues);
  const warnings = decisions.flatMap((decision) => decision.warnings);
  const redactions = decisions.flatMap((decision) => decision.redactions);
  const withheldItems = decisions
    .filter((decision) => decision.issues.length)
    .map((decision) => decision.id);

  return {
    projectId: packet.projectId || "unknown-project",
    generatedAt: packet.generatedAt || new Date().toISOString(),
    status: blockers.length ? "hold_review_publication" : warnings.length ? "moderation_review_needed" : "community_ready",
    summary: {
      reviewsChecked: reviews.length,
      commentsChecked: comments.length,
      blockers: blockers.length,
      warnings: warnings.length,
      redactions: redactions.length,
      withheldItems: withheldItems.length
    },
    moderationPacket: {
      blockers,
      warnings,
      redactions,
      withheldItems,
      recommendation: blockers.length
        ? "Hold publication and prevent reputation impact until moderator review."
        : warnings.length
          ? "Publish only after reviewer confirms anchors and actionability."
          : "Safe to publish and apply profile/timeline credit."
    },
    decisions
  };
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildMarkdownReport(result) {
  const lines = [
    "# Peer Review Civility And Evidence Gate Report",
    "",
    `Project: ${result.projectId}`,
    `Status: ${result.status}`,
    `Generated: ${result.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Reviews checked: ${result.summary.reviewsChecked}`,
    `- Comments checked: ${result.summary.commentsChecked}`,
    `- Blockers: ${result.summary.blockers}`,
    `- Warnings: ${result.summary.warnings}`,
    `- Redactions: ${result.summary.redactions}`,
    `- Withheld items: ${result.summary.withheldItems}`,
    "",
    "## Recommendation",
    "",
    result.moderationPacket.recommendation,
    "",
    "## Blockers",
    ""
  ];

  if (!result.moderationPacket.blockers.length) {
    lines.push("- None");
  } else {
    for (const issue of result.moderationPacket.blockers) {
      lines.push(`- ${issue.itemId}: ${issue.kind} - ${issue.message}`);
    }
  }

  lines.push("", "## Warnings", "");
  if (!result.moderationPacket.warnings.length) {
    lines.push("- None");
  } else {
    for (const issue of result.moderationPacket.warnings) {
      lines.push(`- ${issue.itemId}: ${issue.kind} - ${issue.message}`);
    }
  }

  lines.push("", "## Decision Trace", "");
  for (const decision of result.decisions) {
    lines.push(
      `- ${decision.id} (${decision.type}): ${decision.issues.length} blocker(s), ${decision.warnings.length} warning(s)`
    );
  }

  return `${lines.join("\n")}\n`;
}

function buildSvgSummary(result) {
  const statusColor = result.status === "community_ready" ? "#1f8f5f" : result.status === "moderation_review_needed" ? "#b26b00" : "#b42318";
  const bars = [
    ["Reviews", result.summary.reviewsChecked, "#2563eb"],
    ["Comments", result.summary.commentsChecked, "#0f766e"],
    ["Blockers", result.summary.blockers, "#b42318"],
    ["Warnings", result.summary.warnings, "#b26b00"],
    ["Redactions", result.summary.redactions, "#7c3aed"]
  ];
  const maxValue = Math.max(1, ...bars.map((bar) => bar[1]));
  const barRows = bars
    .map(([label, value, color], index) => {
      const y = 180 + index * 54;
      const width = Math.max(8, Math.round((value / maxValue) * 520));
      return `
        <text x="72" y="${y + 23}" font-size="22" fill="#18202f">${escapeXml(label)}</text>
        <rect x="210" y="${y}" width="560" height="30" rx="6" fill="#edf2f7"/>
        <rect x="210" y="${y}" width="${width}" height="30" rx="6" fill="${color}"/>
        <text x="790" y="${y + 23}" font-size="22" fill="#18202f">${value}</text>
      `;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#f7fafc"/>
  <rect x="48" y="44" width="1184" height="632" rx="16" fill="#ffffff" stroke="#d8dee8"/>
  <text x="72" y="105" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#101828">Peer Review Civility And Evidence Gate</text>
  <text x="72" y="145" font-family="Arial, sans-serif" font-size="22" fill="#475467">Project ${escapeXml(result.projectId)} pre-publication moderation packet</text>
  <rect x="880" y="82" width="280" height="48" rx="10" fill="${statusColor}"/>
  <text x="900" y="114" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#ffffff">${escapeXml(result.status)}</text>
  <g font-family="Arial, sans-serif">${barRows}</g>
  <text x="72" y="520" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#101828">Release decision</text>
  <text x="72" y="560" font-family="Arial, sans-serif" font-size="22" fill="#344054">${escapeXml(result.moderationPacket.recommendation)}</text>
  <text x="72" y="625" font-family="Arial, sans-serif" font-size="18" fill="#667085">Synthetic data only. No credentials. Deterministic local demo.</text>
</svg>
`;
}

function writeReportBundle(result, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, "civility-evidence-packet.json");
  const markdownPath = path.join(outputDir, "civility-evidence-report.md");
  const svgPath = path.join(outputDir, "summary.svg");
  fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
  fs.writeFileSync(markdownPath, buildMarkdownReport(result));
  fs.writeFileSync(svgPath, buildSvgSummary(result));
  return { jsonPath, markdownPath, svgPath };
}

module.exports = {
  DEFAULT_POLICY,
  evaluateReviewCivility,
  buildMarkdownReport,
  buildSvgSummary,
  writeReportBundle
};
