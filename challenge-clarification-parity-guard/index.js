'use strict';

const crypto = require('crypto');

const DECISION_RANK = {
  publish_clarifications: 0,
  publish_with_controls: 1,
  hold_evaluation: 2,
  reopen_window: 3,
};

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function parseDate(value, fieldName) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }
  return date;
}

function hoursBetween(start, end) {
  return (parseDate(end, 'end') - parseDate(start, 'start')) / (60 * 60 * 1000);
}

function worstDecision(current, next) {
  return DECISION_RANK[next] > DECISION_RANK[current] ? next : current;
}

function addFinding(findings, severity, code, message, evidence) {
  findings.push({ severity, code, message, evidence });
}

function eligibleTeamIds(challenge) {
  return new Set((challenge.teams || []).filter((team) => team.eligible === true).map((team) => team.id));
}

function clarificationFingerprint(clarifications) {
  return (clarifications || []).map((item) => ({
    id: item.id,
    requestedByTeamId: item.requestedByTeamId,
    requestedAt: item.requestedAt,
    answeredAt: item.answeredAt || null,
    materiality: item.materiality,
    answerVisibility: item.answerVisibility || null,
    attachments: (item.attachments || []).map((attachment) => ({
      id: attachment.id,
      visibility: attachment.visibility,
      sha256: attachment.sha256,
    })),
  }));
}

function expectedClarificationRoot(challenge) {
  return digest({
    challengeId: challenge.challengeId,
    clarifications: clarificationFingerprint(challenge.clarifications),
  });
}

function isMaterial(item) {
  return item.materiality === 'material' || item.materiality === 'scope_change';
}

function evaluateVisibility(challenge, item, teams, findings) {
  if (!isMaterial(item)) {
    return 'publish_clarifications';
  }

  let decision = 'publish_clarifications';
  if (item.answerVisibility !== 'all_eligible') {
    addFinding(findings, 'blocker', 'material_answer_not_broadcast', 'Material sponsor clarification was not broadcast to every eligible team.', {
      challengeId: challenge.challengeId,
      clarificationId: item.id,
      answerVisibility: item.answerVisibility || null,
      eligibleTeamCount: teams.size,
    });
    decision = worstDecision(decision, 'hold_evaluation');
  }

  const privateAttachments = (item.attachments || []).filter((attachment) => attachment.visibility !== 'all_eligible');
  if (privateAttachments.length > 0) {
    addFinding(findings, 'blocker', 'private_attachment_advantage', 'Material clarification attachment is not available to all eligible teams.', {
      challengeId: challenge.challengeId,
      clarificationId: item.id,
      attachmentIds: privateAttachments.map((attachment) => attachment.id),
    });
    decision = worstDecision(decision, 'hold_evaluation');
  }

  return decision;
}

function evaluateScopeChange(challenge, item, findings) {
  if (item.materiality !== 'scope_change') {
    return 'publish_clarifications';
  }

  let decision = 'publish_clarifications';
  if (item.amendmentLinked !== true) {
    addFinding(findings, 'blocker', 'scope_change_missing_amendment', 'Scope-changing clarification must link to the amendment consent workflow.', {
      challengeId: challenge.challengeId,
      clarificationId: item.id,
    });
    decision = worstDecision(decision, 'reopen_window');
  }

  if (item.extendsDeadline !== true) {
    addFinding(findings, 'blocker', 'scope_change_without_submission_extension', 'Scope-changing clarification did not reopen or extend the submission window.', {
      challengeId: challenge.challengeId,
      clarificationId: item.id,
    });
    decision = worstDecision(decision, 'reopen_window');
  }

  return decision;
}

function evaluateAnswerSla(challenge, item, now, findings) {
  const slaHours = challenge.answerSlaHours || 48;
  if (item.answeredAt) {
    const elapsed = hoursBetween(item.requestedAt, item.answeredAt);
    if (elapsed > slaHours) {
      addFinding(findings, 'warning', 'answer_sla_missed', 'Sponsor clarification answer missed the published response SLA.', {
        challengeId: challenge.challengeId,
        clarificationId: item.id,
        elapsedHours: Number(elapsed.toFixed(1)),
        slaHours,
      });
      return 'publish_with_controls';
    }
    return 'publish_clarifications';
  }

  const age = hoursBetween(item.requestedAt, now);
  if (isMaterial(item) && age > slaHours) {
    addFinding(findings, 'blocker', 'material_question_unanswered', 'Material clarification remains unanswered past the response SLA.', {
      challengeId: challenge.challengeId,
      clarificationId: item.id,
      ageHours: Number(age.toFixed(1)),
      slaHours,
    });
    return 'hold_evaluation';
  }

  return 'publish_clarifications';
}

function evaluateAnonymousLeak(challenge, item, findings) {
  if (challenge.anonymousParticipation !== true) {
    return 'publish_clarifications';
  }

  if ((item.identityReferences || []).length > 0) {
    addFinding(findings, 'blocker', 'anonymous_team_identity_leak', 'Clarification packet reveals anonymous solver identity.', {
      challengeId: challenge.challengeId,
      clarificationId: item.id,
      identityReferences: item.identityReferences,
    });
    return 'hold_evaluation';
  }

  return 'publish_clarifications';
}

function evaluateClarificationRoot(challenge, findings) {
  const expected = expectedClarificationRoot(challenge);
  if (challenge.clarificationRoot !== expected) {
    addFinding(findings, 'blocker', 'clarification_root_mismatch', 'Clarification root does not match the published Q&A packet.', {
      challengeId: challenge.challengeId,
      expected,
      actual: challenge.clarificationRoot || null,
    });
    return 'hold_evaluation';
  }
  return 'publish_clarifications';
}

function evaluateChallenge(challenge, now) {
  const findings = [];
  const teams = eligibleTeamIds(challenge);
  let decision = evaluateClarificationRoot(challenge, findings);

  (challenge.clarifications || []).forEach((item) => {
    if (!teams.has(item.requestedByTeamId)) {
      addFinding(findings, 'warning', 'ineligible_team_question', 'Clarification was requested by a team that is not currently eligible.', {
        challengeId: challenge.challengeId,
        clarificationId: item.id,
        requestedByTeamId: item.requestedByTeamId,
      });
      decision = worstDecision(decision, 'publish_with_controls');
    }

    decision = worstDecision(decision, evaluateVisibility(challenge, item, teams, findings));
    decision = worstDecision(decision, evaluateScopeChange(challenge, item, findings));
    decision = worstDecision(decision, evaluateAnswerSla(challenge, item, now, findings));
    decision = worstDecision(decision, evaluateAnonymousLeak(challenge, item, findings));
  });

  const blockers = findings.filter((finding) => finding.severity === 'blocker');
  const warnings = findings.filter((finding) => finding.severity === 'warning');
  if (decision === 'publish_clarifications' && warnings.length > 0) {
    decision = 'publish_with_controls';
  }

  return {
    challengeId: challenge.challengeId,
    title: challenge.title,
    decision,
    eligibleTeamCount: teams.size,
    clarificationCount: (challenge.clarifications || []).length,
    blockers,
    warnings,
    clarificationRoot: challenge.clarificationRoot,
    reviewerPacketDigest: digest({
      challengeId: challenge.challengeId,
      decision,
      blockers,
      warnings,
      clarificationRoot: challenge.clarificationRoot,
    }),
  };
}

function buildOperatorTasks(results) {
  const tasks = [];
  if (results.some((result) => result.blockers.some((finding) => finding.code === 'material_answer_not_broadcast' || finding.code === 'private_attachment_advantage'))) {
    tasks.push('Broadcast material sponsor answers and attachments to every eligible team before evaluation continues.');
  }
  if (results.some((result) => result.blockers.some((finding) => finding.code === 'scope_change_missing_amendment' || finding.code === 'scope_change_without_submission_extension'))) {
    tasks.push('Route scope-changing clarifications through amendment consent and reopen the submission window.');
  }
  if (results.some((result) => result.blockers.some((finding) => finding.code === 'material_question_unanswered'))) {
    tasks.push('Hold challenge evaluation until overdue material questions are answered.');
  }
  if (results.some((result) => result.blockers.some((finding) => finding.code === 'anonymous_team_identity_leak'))) {
    tasks.push('Redact team identities from clarification packets before sponsor or reviewer publication.');
  }
  if (results.some((result) => result.warnings.some((finding) => finding.code === 'answer_sla_missed'))) {
    tasks.push('Publish missed-SLA notices and extend review windows when late sponsor answers affect solver work.');
  }
  if (tasks.length === 0) {
    tasks.push('Publish all clarification packets and continue challenge evaluation.');
  }
  return tasks;
}

function evaluateChallengeClarificationParityGuard(register) {
  const now = register.checkedAt;
  const challenges = (register.challenges || []).map((challenge) => evaluateChallenge(challenge, now));

  return {
    checkedAt: register.checkedAt,
    decision: challenges.some((challenge) => challenge.decision === 'reopen_window') ? 'reopen_window'
      : challenges.some((challenge) => challenge.decision === 'hold_evaluation') ? 'hold_evaluation'
        : challenges.some((challenge) => challenge.decision === 'publish_with_controls') ? 'publish_with_controls'
          : 'publish_clarifications',
    summary: {
      totalChallenges: challenges.length,
      publishClarifications: challenges.filter((challenge) => challenge.decision === 'publish_clarifications').length,
      publishWithControls: challenges.filter((challenge) => challenge.decision === 'publish_with_controls').length,
      holdEvaluation: challenges.filter((challenge) => challenge.decision === 'hold_evaluation').length,
      reopenWindow: challenges.filter((challenge) => challenge.decision === 'reopen_window').length,
    },
    challenges,
    operatorTasks: buildOperatorTasks(challenges),
    auditDigest: digest({
      checkedAt: register.checkedAt,
      challenges: challenges.map((challenge) => ({
        challengeId: challenge.challengeId,
        decision: challenge.decision,
        reviewerPacketDigest: challenge.reviewerPacketDigest,
      })),
    }),
  };
}

module.exports = {
  evaluateChallengeClarificationParityGuard,
  expectedClarificationRoot,
  stableStringify,
  digest,
};
