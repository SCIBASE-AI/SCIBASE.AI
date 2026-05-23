const crypto = require('node:crypto');

const ANONYMOUS_MODES = new Set(['anonymous', 'double-blind', 'blind']);

function stableDigest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

function hoursBetween(start, end) {
  const startTime = Date.parse(start);
  const endTime = Date.parse(end);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return null;
  return (endTime - startTime) / (60 * 60 * 1000);
}

function addFinding(result, event, finding) {
  result.findings.push({
    eventId: event.id,
    reviewerId: event.reviewerId,
    ...finding,
  });
}

function addAction(result, action) {
  if (!result.requiredActions.some((item) => item.type === action.type && item.eventId === action.eventId)) {
    result.requiredActions.push(action);
  }
}

function evaluatePeerReviewAccessibilityAccommodation(packet) {
  const events = Array.isArray(packet?.reputationEvents) ? packet.reputationEvents : [];
  const result = {
    reviewId: packet?.reviewId || 'unknown-review-packet',
    generatedAt: packet?.generatedAt || new Date(0).toISOString(),
    decision: 'approved',
    fairnessScore: 100,
    summary: {
      eventsReviewed: events.length,
      accommodationEvents: 0,
      missingAccessibleArtifacts: 0,
      deadlineIssues: 0,
      privacyHolds: 0,
      localeWindowIssues: 0,
      penaltiesHeld: 0,
    },
    findings: [],
    requiredActions: [],
  };

  for (const event of events) {
    const accommodation = event.accommodation || {};
    const eventIssueTypes = new Set();
    if (accommodation.requested || accommodation.approved) {
      result.summary.accommodationEvents += 1;
    }

    const requiredArtifacts = Array.isArray(accommodation.requiredAccessibleArtifacts)
      ? accommodation.requiredAccessibleArtifacts
      : [];
    const providedArtifacts = new Set(Array.isArray(accommodation.providedAccessibleArtifacts)
      ? accommodation.providedAccessibleArtifacts
      : []);

    if (accommodation.approved) {
      for (const artifact of requiredArtifacts) {
        if (providedArtifacts.has(artifact)) continue;
        result.summary.missingAccessibleArtifacts += 1;
        eventIssueTypes.add('accessibility');
        addFinding(result, event, {
          type: 'missing-accessible-artifact',
          severity: 'blocker',
          message: `Approved accommodation requires ${artifact}, but it is not available.`,
        });
        addAction(result, {
          type: 'publish_accessible_artifact',
          eventId: event.id,
          artifact,
          owner: 'review_steward',
        });
      }

      const needsExtendedDeadline = Array.isArray(accommodation.types)
        && accommodation.types.includes('extended_deadline');
      if (needsExtendedDeadline && !accommodation.adjustedDeadline) {
        result.summary.deadlineIssues += 1;
        eventIssueTypes.add('accessibility');
        addFinding(result, event, {
          type: 'missing-adjusted-deadline',
          severity: 'blocker',
          message: 'Extended-deadline accommodation was approved without an adjusted deadline.',
        });
        addAction(result, {
          type: 'record_adjusted_deadline',
          eventId: event.id,
          owner: 'review_steward',
        });
      }
    }

    if (
      ANONYMOUS_MODES.has(event.mode)
      && accommodation.disclosureVisibleToAuthors
      && String(accommodation.disclosureText || '').trim()
    ) {
      result.summary.privacyHolds += 1;
      addFinding(result, event, {
        type: 'unsafe-accommodation-disclosure',
        severity: 'major',
        message: 'Accommodation details are visible in an anonymous review context.',
      });
      addAction(result, {
        type: 'redact_accommodation_disclosure',
        eventId: event.id,
        owner: 'privacy_steward',
      });
    }

    const locale = event.localeSupport || null;
    if (locale) {
      const responseHours = hoursBetween(locale.invitationSentAt, locale.responseDeadline);
      if (responseHours !== null && responseHours < Number(locale.minimumLocalHours || 0)) {
        result.summary.localeWindowIssues += 1;
        eventIssueTypes.add('locale');
        addFinding(result, event, {
          type: 'insufficient-local-response-window',
          severity: 'major',
          message: `Reviewer response window is ${responseHours.toFixed(1)} hours, below required ${locale.minimumLocalHours} hours.`,
        });
        addAction(result, {
          type: 'extend_response_window',
          eventId: event.id,
          owner: 'review_coordinator',
        });
      }

      if (
        locale.requiredLanguage
        && locale.requiredLanguage !== 'en'
        && !locale.translatedAbstractProvided
      ) {
        result.summary.localeWindowIssues += 1;
        eventIssueTypes.add('locale');
        addFinding(result, event, {
          type: 'missing-translation-support',
          severity: 'major',
          message: `Reviewer requires ${locale.requiredLanguage} support, but no translated abstract was provided.`,
        });
        addAction(result, {
          type: 'provide_translated_abstract',
          eventId: event.id,
          owner: 'review_coordinator',
        });
      }
    }

    if (Number(event.proposedReputationDelta || 0) < 0 && eventIssueTypes.size > 0) {
      result.summary.penaltiesHeld += 1;
      addFinding(result, event, {
        type: 'unfair-reputation-penalty',
        severity: 'blocker',
        message: `Negative reputation delta ${event.proposedReputationDelta} is held until accessibility and locale issues are resolved.`,
      });
      addAction(result, {
        type: 'freeze_reputation_penalty',
        eventId: event.id,
        owner: 'reputation_steward',
      });
    }
  }

  const penalty =
    result.summary.missingAccessibleArtifacts * 15
    + result.summary.deadlineIssues * 20
    + result.summary.privacyHolds * 20
    + result.summary.localeWindowIssues * 10
    + result.summary.penaltiesHeld * 25;
  result.fairnessScore = Math.max(0, 100 - penalty);

  if (result.summary.penaltiesHeld > 0 || result.summary.missingAccessibleArtifacts > 0 || result.summary.deadlineIssues > 0) {
    result.decision = 'hold-for-accessibility-review';
  } else if (result.summary.privacyHolds > 0 || result.summary.localeWindowIssues > 0) {
    result.decision = 'needs-steward-review';
  }

  result.auditDigest = stableDigest({
    reviewId: result.reviewId,
    generatedAt: result.generatedAt,
    decision: result.decision,
    fairnessScore: result.fairnessScore,
    findings: result.findings.map((finding) => [finding.eventId, finding.type, finding.severity]),
    actions: result.requiredActions.map((action) => [action.eventId, action.type]),
  });

  return result;
}

function buildReviewerPacket(result) {
  const findingRows = result.findings.length
    ? result.findings.map((finding) => `- ${finding.severity}: ${finding.type} on ${finding.eventId} - ${finding.message}`).join('\n')
    : '- none';
  const actionRows = result.requiredActions.length
    ? result.requiredActions.map((action) => `- ${action.type} for ${action.eventId} (${action.owner})`).join('\n')
    : '- none';

  return [
    '# Peer Review Accessibility Accommodation Guard Report',
    '',
    `Review packet: ${result.reviewId}`,
    `Generated at: ${result.generatedAt}`,
    `Decision: ${result.decision}`,
    `Fairness score: ${result.fairnessScore}`,
    `Findings: ${result.findings.length}`,
    `Required actions: ${result.requiredActions.length}`,
    `Audit digest: ${result.auditDigest}`,
    '',
    '## Summary',
    '',
    `- Events reviewed: ${result.summary.eventsReviewed}`,
    `- Accommodation events: ${result.summary.accommodationEvents}`,
    `- Missing accessible artifacts: ${result.summary.missingAccessibleArtifacts}`,
    `- Deadline issues: ${result.summary.deadlineIssues}`,
    `- Privacy holds: ${result.summary.privacyHolds}`,
    `- Locale/window issues: ${result.summary.localeWindowIssues}`,
    `- Reputation penalties held: ${result.summary.penaltiesHeld}`,
    '',
    '## Findings',
    '',
    findingRows,
    '',
    '## Required Actions',
    '',
    actionRows,
    '',
  ].join('\n');
}

function buildSummarySvg(result) {
  const scoreWidth = Math.max(24, Math.min(760, Math.round(result.fairnessScore * 7.6)));
  const findingWidth = Math.max(24, Math.min(760, result.findings.length * 84));
  const actionWidth = Math.max(24, Math.min(760, result.requiredActions.length * 84));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Peer review accessibility accommodation guard summary">
  <rect width="960" height="540" fill="#17231f"/>
  <rect x="48" y="44" width="864" height="452" rx="6" fill="#f8faf7" opacity="0.94"/>
  <text x="78" y="98" font-family="Arial, sans-serif" font-size="28" fill="#17231f" font-weight="700">Accessibility Accommodation Guard</text>
  <text x="78" y="132" font-family="Arial, sans-serif" font-size="16" fill="#33433d">Decision: ${escapeXml(result.decision)} | Digest: ${escapeXml(result.auditDigest)}</text>
  <text x="78" y="188" font-family="Arial, sans-serif" font-size="18" fill="#17231f">Fairness score</text>
  <rect x="78" y="206" width="760" height="34" fill="#d8e2dc"/>
  <rect x="78" y="206" width="${scoreWidth}" height="34" fill="#2f855a"/>
  <text x="852" y="230" font-family="Arial, sans-serif" font-size="18" fill="#17231f">${result.fairnessScore}</text>
  <text x="78" y="294" font-family="Arial, sans-serif" font-size="18" fill="#17231f">Findings</text>
  <rect x="78" y="312" width="760" height="34" fill="#d8e2dc"/>
  <rect x="78" y="312" width="${findingWidth}" height="34" fill="#b45309"/>
  <text x="852" y="336" font-family="Arial, sans-serif" font-size="18" fill="#17231f">${result.findings.length}</text>
  <text x="78" y="400" font-family="Arial, sans-serif" font-size="18" fill="#17231f">Required actions</text>
  <rect x="78" y="418" width="760" height="34" fill="#d8e2dc"/>
  <rect x="78" y="418" width="${actionWidth}" height="34" fill="#1d4ed8"/>
  <text x="852" y="442" font-family="Arial, sans-serif" font-size="18" fill="#17231f">${result.requiredActions.length}</text>
</svg>`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = {
  evaluatePeerReviewAccessibilityAccommodation,
  buildReviewerPacket,
  buildSummarySvg,
};
