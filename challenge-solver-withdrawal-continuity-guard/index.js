function list(value) {
  return Array.isArray(value) ? value : [];
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function fullDaysBetween(older, newer) {
  const olderTime = Date.parse(older);
  const newerTime = Date.parse(newer);
  if (!Number.isFinite(olderTime) || !Number.isFinite(newerTime)) {
    return Infinity;
  }
  return Math.floor((newerTime - olderTime) / 86400000);
}

function addFinding(findings, requiredActions, finding, action) {
  findings.push(finding);
  if (action) {
    requiredActions.push(action);
  }
}

function reviewerAction(type, target, reason) {
  return {type, target, reason};
}

function collectTeams(input) {
  return list(input.teams).map((team) => ({
    ...team,
    members: list(team.members),
    artifacts: list(team.artifacts),
    notifications: list(team.notifications),
  }));
}

function withdrawingMembers(team) {
  return team.members.filter((member) => normalize(member.status) === 'withdrawing');
}

function continuityMembers(team) {
  return team.members.filter((member) => {
    const status = normalize(member.status);
    if (status === 'active') {
      return true;
    }
    return status === 'replacement' && member.replacementEligible === true && member.ndaAccepted === true;
  });
}

function readyReplacements(team) {
  return team.members.filter((member) => (
    normalize(member.status) === 'replacement'
    && member.replacementEligible === true
    && member.ndaAccepted === true
  ));
}

function notificationAudiences(team) {
  return new Set(team.notifications.filter((notice) => hasText(notice.sentAt)).map((notice) => normalize(notice.audience)));
}

function countSeverities(findings) {
  return findings.reduce((counts, finding) => {
    counts[finding.severity] = (counts[finding.severity] || 0) + 1;
    return counts;
  }, {critical: 0, high: 0, medium: 0});
}

function decide(findings) {
  if (findings.some((finding) => finding.severity === 'critical')) {
    return 'hold-workspace-continuity';
  }
  if (findings.length > 0) {
    return 'coordinator-review';
  }
  return 'continuity-ready';
}

function evaluateSolverWithdrawalContinuity(input) {
  const generatedAt = input.generatedAt || new Date(0).toISOString();
  const teams = collectTeams(input);
  const findings = [];
  const requiredActions = [];
  let replacementsReady = 0;
  const affectedTeams = new Set();

  for (const team of teams) {
    const teamId = team.id || 'unknown-team';
    const withdrawing = withdrawingMembers(team);
    const withdrawingIds = new Set(withdrawing.map((member) => member.id));
    replacementsReady += readyReplacements(team).length;

    for (const member of withdrawing) {
      const memberId = member.id || 'unknown-solver';
      affectedTeams.add(teamId);
      if (!hasText(member.noticeAt)) {
        addFinding(
          findings,
          requiredActions,
          {
            type: 'missing-withdrawal-notice',
            severity: 'critical',
            target: memberId,
            teamId,
            message: `${memberId} is withdrawing without a dated notice record.`,
          },
          reviewerAction(
            'record_withdrawal_notice',
            memberId,
            'challenge coordinators need a dated notice before changing solver team state'
          )
        );
      }

      const accessRevoked = hasText(member.accessRevokedAt);
      const accessAfterRevocation = accessRevoked
        && Date.parse(member.lastWorkspaceAccessAt) > Date.parse(member.accessRevokedAt);
      if (!accessRevoked || accessAfterRevocation) {
        addFinding(
          findings,
          requiredActions,
          {
            type: 'access-revocation-missing',
            severity: 'critical',
            target: memberId,
            teamId,
            message: `${memberId} still needs workspace access revocation evidence.`,
          },
          reviewerAction(
            'revoke_workspace_access',
            memberId,
            'private challenge data and submission workspaces must be protected after withdrawal'
          )
        );
      }

      if (member.ipReturnConfirmed !== true) {
        addFinding(
          findings,
          requiredActions,
          {
            type: 'ip-return-missing',
            severity: 'high',
            target: memberId,
            teamId,
            message: `${memberId} lacks IP return, retention, or destruction confirmation.`,
          },
          reviewerAction(
            'confirm_ip_return_duties',
            memberId,
            'solver-owned and sponsor-confidential materials need explicit custody status'
          )
        );
      }
    }

    if (withdrawing.length > 0 && continuityMembers(team).length < (team.minActiveMembers || 1)) {
      addFinding(
        findings,
        requiredActions,
        {
          type: 'team-quorum-broken',
          severity: 'critical',
          target: teamId,
          activeContinuityMembers: continuityMembers(team).length,
          minActiveMembers: team.minActiveMembers || 1,
          message: `${teamId} falls below required active solver quorum after withdrawal.`,
        },
        reviewerAction(
          'restore_team_quorum',
          teamId,
          'challenge fairness requires enough active or eligible replacement solvers before work continues'
        )
      );
      affectedTeams.add(teamId);
    }

    const orphanedArtifacts = team.artifacts.filter((artifact) => (
      withdrawingIds.has(artifact.ownerId) && artifact.custodyConfirmed !== true
    ));
    if (orphanedArtifacts.length > 0) {
      addFinding(
        findings,
        requiredActions,
        {
          type: 'artifact-custody-gap',
          severity: 'high',
          target: teamId,
          artifactIds: orphanedArtifacts.map((artifact) => artifact.id || 'unknown-artifact'),
          message: `${teamId} has withdrawing-solver artifacts without custody confirmation.`,
        },
        reviewerAction(
          'confirm_artifact_custody',
          teamId,
          'submission artifacts need owner handoff before sponsor review or scoring continues'
        )
      );
      affectedTeams.add(teamId);
    }

    if (withdrawing.length > 0 && fullDaysBetween(generatedAt, team.currentMilestoneDueAt) <= 7) {
      addFinding(
        findings,
        requiredActions,
        {
          type: 'milestone-continuity-risk',
          severity: 'medium',
          target: teamId,
          dueAt: team.currentMilestoneDueAt,
          message: `${teamId} has a milestone due within 7 days of a withdrawal event.`,
        },
        reviewerAction(
          'review_milestone_extension',
          teamId,
          'near-term milestones may need sponsor-approved extension or partial-credit handling'
        )
      );
      affectedTeams.add(teamId);
    }

    const audiences = notificationAudiences(team);
    if (withdrawing.length > 0 && (!audiences.has('sponsor') || !audiences.has('reviewers'))) {
      addFinding(
        findings,
        requiredActions,
        {
          type: 'stakeholder-notification-gap',
          severity: 'medium',
          target: teamId,
          missingAudiences: ['sponsor', 'reviewers'].filter((audience) => !audiences.has(audience)),
          message: `${teamId} has incomplete sponsor or reviewer withdrawal notifications.`,
        },
        reviewerAction(
          'notify_stakeholders',
          teamId,
          'sponsors and reviewers need synchronized withdrawal state before judging or deadlines change'
        )
      );
      affectedTeams.add(teamId);
    }
  }

  const severities = countSeverities(findings);
  return {
    challengeId: input.challengeId || 'unknown-challenge',
    generatedAt,
    decision: decide(findings),
    summary: {
      teams: teams.length,
      affectedTeams: affectedTeams.size,
      withdrawingSolvers: teams.reduce((sum, team) => sum + withdrawingMembers(team).length, 0),
      replacementsReady,
      requiredActions: requiredActions.length,
      ...severities,
    },
    findings,
    requiredActions,
  };
}

function buildCoordinatorPacket(result) {
  const lines = [
    '# Solver Withdrawal Continuity Guard',
    '',
    `Challenge: ${result.challengeId}`,
    `Decision: ${result.decision}`,
    `Generated: ${result.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Teams reviewed: ${result.summary.teams}`,
    `- Affected teams: ${result.summary.affectedTeams}`,
    `- Withdrawing solvers: ${result.summary.withdrawingSolvers}`,
    `- Ready replacements: ${result.summary.replacementsReady}`,
    `- Required actions: ${result.summary.requiredActions}`,
    '',
  ];

  if (result.findings.length === 0) {
    lines.push('No blocking withdrawal continuity gaps detected.');
  } else {
    lines.push('## Findings', '');
    for (const finding of result.findings) {
      lines.push(`- **${finding.severity}** ${finding.type}: ${finding.message}`);
    }
    lines.push('', '## Required Actions', '');
    for (const action of result.requiredActions) {
      lines.push(`- ${action.type} (${action.target}): ${action.reason}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

module.exports = {
  evaluateSolverWithdrawalContinuity,
  buildCoordinatorPacket,
};
