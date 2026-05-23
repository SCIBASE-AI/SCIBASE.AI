const crypto = require('node:crypto');

const PUBLIC_ARTIFACT_TYPES = new Set(['dataset', 'notebook', 'code', 'package', 'winner-announcement']);
const SHA256_RE = /^sha256:[a-f0-9]{64}$/i;

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function digestPacket(packet) {
  return `sha256:${crypto.createHash('sha256').update(stableStringify(packet)).digest('hex')}`;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(first, second) {
  return Math.round((second.getTime() - first.getTime()) / 86400000);
}

function issue(code, message, evidence = {}) {
  return {code, message, evidence};
}

function hasSolverApproval(packet, teamId) {
  const approvals = packet.ndaRelease?.solverApprovals || [];
  return approvals.some((approval) => approval.teamId === teamId && approval.approved === true);
}

function evaluateArtifact(artifact) {
  const reasons = [];
  if (artifact.visibility === 'public' && PUBLIC_ARTIFACT_TYPES.has(artifact.type) && artifact.redaction !== 'complete') {
    reasons.push('REDACTION_INCOMPLETE');
  }
  if (!SHA256_RE.test(String(artifact.checksum || ''))) {
    reasons.push('CHECKSUM_INVALID');
  }
  if (artifact.visibility === 'public' && !artifact.license) {
    reasons.push('LICENSE_MISSING');
  }

  return {
    id: artifact.id,
    type: artifact.type,
    visibility: artifact.visibility,
    decision: reasons.length ? 'hold' : 'release',
    reasons,
  };
}

function analyzeReleasePacket(packet) {
  const releaseDate = parseDate(packet.releaseDate);
  const blockers = [];
  const warnings = [];

  if (!releaseDate) {
    blockers.push(issue('RELEASE_DATE_INVALID', 'Release packet must include a valid releaseDate.'));
  }

  if (!packet.sponsor?.approval?.approved) {
    blockers.push(issue('SPONSOR_RELEASE_APPROVAL_MISSING', 'Sponsor release approval is required before public challenge release.'));
  }

  for (const embargo of packet.embargoes || []) {
    const endsAt = parseDate(embargo.endsAt);
    if (!releaseDate || !endsAt || (endsAt > releaseDate && embargo.releaseApproved !== true)) {
      blockers.push(issue(
        'ACTIVE_EMBARGO',
        `Embargo ${embargo.id} is still active or lacks explicit release approval.`,
        {embargoId: embargo.id, type: embargo.type, endsAt: embargo.endsAt},
      ));
    }
  }

  for (const hold of packet.patentHolds || []) {
    if (hold.status !== 'cleared' || !hold.docketId || !hold.counselApprovedAt) {
      blockers.push(issue(
        'PATENT_HOLD_UNCLEARED',
        `Patent hold ${hold.id} needs docket and counsel clearance before artifacts are exposed.`,
        {holdId: hold.id, status: hold.status},
      ));
    }
  }

  if (packet.visibility === 'public') {
    for (const hold of packet.publicationHolds || []) {
      if (hold.status !== 'cleared' || !hold.clearedAt) {
        blockers.push(issue(
          'PUBLICATION_HOLD_UNCLEARED',
          `Publication hold ${hold.id} must clear before public release.`,
          {holdId: hold.id, status: hold.status},
        ));
      }
    }
  }

  if (packet.ndaRelease?.required) {
    if (!packet.ndaRelease.sponsorApproved) {
      blockers.push(issue('NDA_RELEASE_APPROVAL_MISSING', 'Sponsor NDA release approval is missing.'));
    }
    for (const winner of packet.award?.winners || []) {
      if (!hasSolverApproval(packet, winner.teamId)) {
        blockers.push(issue(
          'NDA_RELEASE_APPROVAL_MISSING',
          `Solver team ${winner.teamId} has not approved NDA release.`,
          {teamId: winner.teamId},
        ));
      }
    }
  }

  if (packet.visibility === 'public' && packet.award?.winnerAnnouncement) {
    for (const winner of packet.award.winners || []) {
      if (!winner.consentToPublicName) {
        blockers.push(issue(
          'WINNER_PUBLIC_CONSENT_MISSING',
          `Winner team ${winner.teamId} has not consented to public naming.`,
          {teamId: winner.teamId},
        ));
      }
    }
  }

  const deadline = parseDate(packet.funderPolicy?.openScienceDeadline);
  if (releaseDate && deadline) {
    const daysUntilDeadline = daysBetween(releaseDate, deadline);
    if (daysUntilDeadline < 0 && !packet.funderPolicy.exceptionApproved) {
      blockers.push(issue(
        'FUNDER_DEADLINE_MISSED',
        'Release date is after the funder open-science deadline without an approved exception.',
        {deadline: packet.funderPolicy.openScienceDeadline},
      ));
    } else if (daysUntilDeadline >= 0 && daysUntilDeadline <= 7) {
      warnings.push(issue(
        'FUNDER_DEADLINE_NEAR',
        'Release date is within seven days of the funder open-science deadline.',
        {deadline: packet.funderPolicy.openScienceDeadline, daysUntilDeadline},
      ));
    }
  }

  const artifactDecisions = (packet.artifacts || []).map(evaluateArtifact);
  for (const artifact of artifactDecisions.filter((item) => item.decision === 'hold')) {
    blockers.push(issue(
      'ARTIFACT_RELEASE_UNSAFE',
      `Artifact ${artifact.id} is not safe for requested visibility.`,
      {artifactId: artifact.id, reasons: artifact.reasons},
    ));
  }

  const status = blockers.length ? 'hold' : 'release_ready';
  const summary = {
    releaseReady: status === 'release_ready',
    blockers: blockers.length,
    warnings: warnings.length,
    artifactsReady: artifactDecisions.filter((item) => item.decision === 'release').length,
    artifactsHeld: artifactDecisions.filter((item) => item.decision === 'hold').length,
  };

  return {
    challengeId: packet.challengeId,
    title: packet.title,
    status,
    summary,
    blockers,
    warnings,
    artifactDecisions,
    actions: buildActions(blockers),
    digest: digestPacket({
      challengeId: packet.challengeId,
      releaseDate: packet.releaseDate,
      visibility: packet.visibility,
      blockers,
      warnings,
      artifactDecisions,
    }),
  };
}

function buildActions(blockers) {
  const actions = new Set();
  for (const blocker of blockers) {
    if (blocker.code === 'ACTIVE_EMBARGO') actions.add('Keep release packet private until embargo approval or end date.');
    if (blocker.code === 'PATENT_HOLD_UNCLEARED') actions.add('Collect patent docket and counsel clearance before exposing artifacts.');
    if (blocker.code === 'PUBLICATION_HOLD_UNCLEARED') actions.add('Wait for manuscript/preprint clearance before public release.');
    if (blocker.code === 'NDA_RELEASE_APPROVAL_MISSING') actions.add('Collect sponsor and solver NDA release approvals.');
    if (blocker.code === 'WINNER_PUBLIC_CONSENT_MISSING') actions.add('Use anonymized winner labels until public-name consent exists.');
    if (blocker.code === 'ARTIFACT_RELEASE_UNSAFE') actions.add('Complete redaction, checksum, and license evidence for held artifacts.');
    if (blocker.code === 'FUNDER_DEADLINE_MISSED') actions.add('Escalate missed open-science deadline or attach approved exception.');
  }
  return [...actions];
}

module.exports = {
  analyzeReleasePacket,
};
