'use strict';

const crypto = require('node:crypto');

const CONFIDENTIAL_CLASSES = new Set(['confidential', 'restricted']);
const REVIEW_CLASSES = new Set(['public-preview', 'metadata-only']);
const ROLE_PERMISSIONS = {
  solver: new Set(['edit', 'submit', 'view-own-artifact', 'export-package']),
  sponsor: new Set(['view-public-preview', 'view-metadata', 'accept-award']),
  reviewer: new Set(['view-review-material', 'score', 'request-clarification']),
  arbitrator: new Set(['view-review-material', 'view-confidential-after-dispute', 'resolve-dispute'])
};

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function isIsoDate(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

function normalizeList(value) {
  return Array.isArray(value) ? value : [];
}

function evaluatePrequalification(challenge, workspace) {
  const allowedDomains = new Set(normalizeList(challenge.prequalification?.allowedDomains));
  const allowedInstitutionTypes = new Set(normalizeList(challenge.prequalification?.allowedInstitutionTypes));
  const requiresConflictDisclosure = Boolean(challenge.prequalification?.requiresConflictDisclosure);
  const blockers = [];
  const warnings = [];

  for (const member of normalizeList(workspace.members)) {
    const hasDomainFit = allowedDomains.size === 0 || normalizeList(member.domains).some((domain) => allowedDomains.has(domain));
    if (!hasDomainFit) {
      blockers.push({
        code: 'domain-mismatch',
        memberId: member.id,
        message: `${member.publicAlias || member.name} has no allowed scientific domain for this challenge.`
      });
    }

    if (allowedInstitutionTypes.size > 0 && !allowedInstitutionTypes.has(member.institutionType)) {
      blockers.push({
        code: 'institution-not-eligible',
        memberId: member.id,
        message: `${member.publicAlias || member.name} has institution type ${member.institutionType}, which is not eligible.`
      });
    }

    if (challenge.ndaRequired && !isIsoDate(member.ndaSignedAt)) {
      blockers.push({
        code: 'nda-missing',
        memberId: member.id,
        message: `${member.publicAlias || member.name} must sign the challenge NDA before submission.`
      });
    }

    if (requiresConflictDisclosure && !member.conflictDisclosure) {
      blockers.push({
        code: 'conflict-disclosure-missing',
        memberId: member.id,
        message: `${member.publicAlias || member.name} must provide a conflict disclosure.`
      });
    }

    if (member.conflictDisclosure && member.conflictDisclosure !== 'none') {
      warnings.push({
        code: 'declared-conflict',
        memberId: member.id,
        message: `${member.publicAlias || member.name} declared conflict: ${member.conflictDisclosure}.`
      });
    }
  }

  return {
    workspaceId: workspace.id,
    status: blockers.length === 0 ? 'eligible' : 'hold',
    blockers,
    warnings
  };
}

function checkDeliverables(challenge, workspace) {
  const required = new Set(normalizeList(challenge.requiredDeliverables));
  const delivered = new Set();
  const blockers = [];
  const warnings = [];

  for (const artifact of normalizeList(workspace.artifacts)) {
    if (artifact.deliverable) {
      delivered.add(artifact.deliverable);
    }

    if (!artifact.sha256 || !/^[a-f0-9]{64}$/i.test(artifact.sha256)) {
      blockers.push({
        code: 'artifact-hash-missing',
        artifactId: artifact.id,
        message: `${artifact.title} needs a 64-character SHA-256 digest before package export.`
      });
    }

    if (CONFIDENTIAL_CLASSES.has(artifact.classification) && artifact.license !== challenge.ipPolicy) {
      warnings.push({
        code: 'ip-policy-mismatch',
        artifactId: artifact.id,
        message: `${artifact.title} should use challenge IP policy ${challenge.ipPolicy}.`
      });
    }
  }

  for (const deliverable of required) {
    if (!delivered.has(deliverable)) {
      blockers.push({
        code: 'deliverable-missing',
        deliverable,
        message: `Required deliverable ${deliverable} is not represented in the workspace package.`
      });
    }
  }

  return {
    required: [...required],
    delivered: [...delivered].sort(),
    blockers,
    warnings
  };
}

function checkReviewerConflicts(workspace) {
  const blockers = [];
  const members = normalizeList(workspace.members);
  const memberInstitutions = new Set(members
    .map((member) => member.institution)
    .filter(Boolean)
    .map((institution) => institution.toLowerCase()));
  const memberInstitutionTypes = new Set(members
    .map((member) => member.institutionType)
    .filter(Boolean));

  for (const reviewer of normalizeList(workspace.reviewers)) {
    const explicitConflict = normalizeList(reviewer.conflicts).includes(workspace.id);
    const reviewerInstitution = reviewer.institution ? reviewer.institution.toLowerCase() : '';
    const sameInstitution = reviewerInstitution && memberInstitutions.has(reviewerInstitution);
    const sameInstitutionType = reviewer.institutionType && memberInstitutionTypes.has(reviewer.institutionType);

    if (explicitConflict || sameInstitution || sameInstitutionType) {
      blockers.push({
        code: 'reviewer-conflict',
        reviewerId: reviewer.id,
        message: `${reviewer.name} cannot review ${workspace.id} because a conflict is declared or inferred.`
      });
    }
  }

  return blockers;
}

function evaluateWorkspacePrivacy(challenge, workspace) {
  const prequalification = evaluatePrequalification(challenge, workspace);
  const deliverables = checkDeliverables(challenge, workspace);
  const reviewerBlockers = checkReviewerConflicts(workspace);
  const blockers = [
    ...prequalification.blockers,
    ...deliverables.blockers,
    ...reviewerBlockers
  ];
  const warnings = [
    ...prequalification.warnings,
    ...deliverables.warnings
  ];

  return {
    workspaceId: workspace.id,
    status: blockers.length === 0 ? 'ready' : 'hold',
    blockers,
    warnings,
    prequalification,
    deliverables,
    reviewerConflicts: reviewerBlockers
  };
}

function redactedMember(member, anonymous) {
  if (!anonymous) {
    return {
      id: member.id,
      name: member.name,
      role: member.role,
      institutionType: member.institutionType,
      domains: normalizeList(member.domains).slice().sort()
    };
  }

  return {
    id: member.publicAlias || member.id,
    role: member.role,
    institutionType: member.institutionType,
    domains: normalizeList(member.domains).slice().sort()
  };
}

function artifactManifest(artifact, includeConfidentialTitles = false) {
  const safeTitle = CONFIDENTIAL_CLASSES.has(artifact.classification) && !includeConfidentialTitles
    ? `${artifact.classification} artifact`
    : artifact.title;

  return {
    id: artifact.id,
    deliverable: artifact.deliverable,
    title: safeTitle,
    classification: artifact.classification,
    phase: artifact.phase,
    sha256: artifact.sha256 || null,
    license: artifact.license
  };
}

function buildSubmissionPackage(challenge, workspace, options = {}) {
  const privacy = evaluateWorkspacePrivacy(challenge, workspace);
  const anonymous = challenge.anonymousSubmissions || workspace.participationMode === 'anonymous';
  const includeConfidentialTitles = Boolean(options.includeConfidentialTitles);
  const packageBody = {
    challenge: {
      id: challenge.id,
      title: challenge.title,
      phase: challenge.phase,
      visibility: challenge.visibility,
      ipPolicy: challenge.ipPolicy,
      payoutState: challenge.payoutState
    },
    workspace: {
      id: workspace.id,
      teamName: anonymous ? 'anonymous solver team' : workspace.teamName,
      participationMode: workspace.participationMode,
      status: privacy.status
    },
    members: normalizeList(workspace.members)
      .map((member) => redactedMember(member, anonymous))
      .sort((a, b) => a.id.localeCompare(b.id)),
    artifacts: normalizeList(workspace.artifacts)
      .map((artifact) => artifactManifest(artifact, includeConfidentialTitles))
      .sort((a, b) => a.id.localeCompare(b.id)),
    deliverables: privacy.deliverables,
    accessSummary: {
      sponsorPreview: 'metadata-and-public-preview-only',
      confidentialRelease: challenge.payoutState === 'paid' ? 'allowed-after-award' : 'blocked-until-paid',
      arbitrationEvidence: 'allowed-on-dispute'
    },
    blockers: privacy.blockers,
    warnings: privacy.warnings,
    auditDigest: digest(normalizeList(workspace.auditEvents))
  };

  return {
    ...packageBody,
    packageDigest: digest(packageBody)
  };
}

function canViewArtifactClass(role, artifact, challenge, context) {
  const permissions = ROLE_PERMISSIONS[role] || new Set();
  const now = new Date(context.now || new Date().toISOString());
  const unlockAt = new Date(challenge.evaluationUnlockAt);
  const evaluationUnlocked = Number.isFinite(unlockAt.getTime()) && now >= unlockAt;

  if (role === 'solver' && permissions.has('view-own-artifact')) {
    return true;
  }

  if (role === 'sponsor') {
    if (REVIEW_CLASSES.has(artifact.classification)) {
      return true;
    }
    return evaluationUnlocked && challenge.payoutState === 'paid';
  }

  if (role === 'reviewer') {
    return evaluationUnlocked && !CONFIDENTIAL_CLASSES.has(artifact.classification);
  }

  if (role === 'arbitrator') {
    return Boolean(context.disputeOpen) && permissions.has('view-confidential-after-dispute');
  }

  return false;
}

function decideWorkspaceAccess(challenge, workspace, actor, action, context = {}) {
  const artifact = normalizeList(workspace.artifacts).find((candidate) => candidate.id === context.artifactId);
  const permissions = ROLE_PERMISSIONS[actor.role] || new Set();

  if (action === 'viewArtifact') {
    if (!artifact) {
      return {
        decision: 'denied',
        reason: 'artifact-not-found'
      };
    }

    const allowed = canViewArtifactClass(actor.role, artifact, challenge, context);
    return {
      decision: allowed ? 'allowed' : 'denied',
      reason: allowed ? 'policy-allowed' : 'confidentiality-or-payment-gate',
      artifactId: artifact.id,
      classification: artifact.classification
    };
  }

  if (!permissions.has(action)) {
    return {
      decision: 'denied',
      reason: `role-${actor.role}-lacks-${action}`
    };
  }

  if (action === 'export-package') {
    const privacy = evaluateWorkspacePrivacy(challenge, workspace);
    return {
      decision: privacy.status === 'ready' ? 'allowed' : 'denied',
      reason: privacy.status === 'ready' ? 'package-ready' : 'privacy-blockers-present',
      blockerCount: privacy.blockers.length
    };
  }

  return {
    decision: 'allowed',
    reason: 'role-permission'
  };
}

function summarizePortfolio(challenge, workspaces) {
  const summaries = normalizeList(workspaces).map((workspace) => {
    const privacy = evaluateWorkspacePrivacy(challenge, workspace);
    const pack = buildSubmissionPackage(challenge, workspace);
    return {
      workspaceId: workspace.id,
      status: privacy.status,
      blockerCount: privacy.blockers.length,
      warningCount: privacy.warnings.length,
      artifactCount: normalizeList(workspace.artifacts).length,
      packageDigest: pack.packageDigest
    };
  });

  return {
    challengeId: challenge.id,
    ready: summaries.filter((summary) => summary.status === 'ready').length,
    hold: summaries.filter((summary) => summary.status === 'hold').length,
    workspaces: summaries,
    portfolioDigest: digest(summaries)
  };
}

module.exports = {
  buildSubmissionPackage,
  decideWorkspaceAccess,
  digest,
  evaluatePrequalification,
  evaluateWorkspacePrivacy,
  summarizePortfolio
};
