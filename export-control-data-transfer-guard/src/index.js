const RESTRICTED_COUNTRIES = new Set(['CU', 'IR', 'KP', 'SY', 'RU', 'BY']);
const SENSITIVE_TOPICS = new Set([
  'dual-use',
  'controlled-biological-agent',
  'encryption-research',
  'satellite-imagery',
  'advanced-semiconductor',
  'autonomous-weapons',
]);
const HIGH_RISK_DATA_TYPES = new Set([
  'human-subject-data',
  'genomic-data',
  'clinical-trial-data',
  'geolocation-precision',
  'critical-infrastructure',
]);

function list(value) {
  return Array.isArray(value) ? value : [];
}

function normalizedSet(values) {
  return new Set(list(values).map((value) => String(value).trim()).filter(Boolean));
}

function includesAny(values, reference) {
  return [...normalizedSet(values)].filter((value) => reference.has(value));
}

function addFinding(findings, severity, code, message, remediation) {
  findings.push({ severity, code, message, remediation });
}

export function evaluateExportControlReadiness(challenge) {
  const findings = [];
  const topicHits = includesAny(challenge.topics, SENSITIVE_TOPICS);
  const dataHits = includesAny(challenge.dataTypes, HIGH_RISK_DATA_TYPES);
  const participantCountries = normalizedSet(challenge.participantCountries);
  const restrictedParticipants = [...participantCountries].filter((country) => RESTRICTED_COUNTRIES.has(country));
  const hasCrossBorderTransfer = participantCountries.size > 1 || Boolean(challenge.crossBorderDataRoom);
  const controls = challenge.controls || {};

  if (topicHits.length > 0 && !controls.exportClassification) {
    addFinding(
      findings,
      'blocker',
      'missing-export-classification',
      `Sensitive challenge topics require export classification before release: ${topicHits.join(', ')}.`,
      'Hold publication until a responsible reviewer records export-control classification or confirms the challenge is not controlled.'
    );
  }

  if (restrictedParticipants.length > 0) {
    addFinding(
      findings,
      'blocker',
      'restricted-participant-jurisdiction',
      `Participant country list includes restricted jurisdictions: ${restrictedParticipants.join(', ')}.`,
      'Do not open the challenge to these participants until legal review approves eligibility and payout routing.'
    );
  }

  if (dataHits.length > 0 && !controls.dataUseAgreement) {
    addFinding(
      findings,
      'blocker',
      'missing-data-use-agreement',
      `Restricted or privacy-sensitive data types require a data-use agreement: ${dataHits.join(', ')}.`,
      'Require a signed data-use agreement before granting access to challenge data or submission workspaces.'
    );
  }

  if (hasCrossBorderTransfer && !controls.dataRoomAccessLog) {
    addFinding(
      findings,
      'warning',
      'missing-transfer-audit-log',
      'Cross-border participation or shared data rooms require an auditable access log.',
      'Enable immutable data-room access logging before releasing controlled datasets.'
    );
  }

  if (challenge.requiresNda && !controls.ndaWorkflow) {
    addFinding(
      findings,
      'warning',
      'missing-nda-workflow',
      'Challenge requires NDA handling, but no NDA workflow is attached.',
      'Attach NDA routing, acceptance timestamps, and revocation steps before submissions open.'
    );
  }

  if (challenge.prizeAmount > 0 && !controls.payoutSanctionsScreening) {
    addFinding(
      findings,
      'warning',
      'missing-payout-screening',
      'Prize payout is configured without sanctions or payout-eligibility screening.',
      'Screen recipients before reward release and record the screening decision with the payout manifest.'
    );
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker');
  const warnings = findings.filter((finding) => finding.severity === 'warning');

  return {
    challengeId: challenge.id,
    decision: blockers.length > 0 ? 'hold' : warnings.length > 0 ? 'revise' : 'release',
    blockers: blockers.length,
    warnings: warnings.length,
    findings,
    releaseConditions: blockers.length > 0
      ? ['Resolve all blocker findings before challenge publication or data-room access.']
      : warnings.map((finding) => finding.remediation),
  };
}

export function buildTransferManifest(challenge, evaluation) {
  return {
    challengeId: challenge.id,
    generatedAt: '2026-06-05T12:40:00.000Z',
    decision: evaluation.decision,
    dataRoom: {
      crossBorder: Boolean(challenge.crossBorderDataRoom),
      dataTypes: list(challenge.dataTypes),
      accessLogRequired: evaluation.findings.some((finding) => finding.code === 'missing-transfer-audit-log'),
    },
    eligibility: {
      participantCountries: list(challenge.participantCountries),
      restrictedJurisdictionPresent: evaluation.findings.some((finding) => finding.code === 'restricted-participant-jurisdiction'),
      payoutScreeningRequired: Boolean(challenge.prizeAmount),
    },
    controls: challenge.controls || {},
    findings: evaluation.findings,
  };
}

export const sampleChallenges = {
  blocked: {
    id: 'bio-agent-open-prize',
    topics: ['controlled-biological-agent', 'ml-modeling'],
    dataTypes: ['genomic-data', 'clinical-trial-data'],
    participantCountries: ['US', 'DE', 'IR'],
    crossBorderDataRoom: true,
    requiresNda: true,
    prizeAmount: 250000,
    controls: {
      exportClassification: '',
      dataUseAgreement: false,
      dataRoomAccessLog: false,
      ndaWorkflow: false,
      payoutSanctionsScreening: false,
    },
  },
  releasable: {
    id: 'open-climate-forecast',
    topics: ['climate-modeling'],
    dataTypes: ['public-weather-data'],
    participantCountries: ['US', 'CA', 'GB'],
    crossBorderDataRoom: false,
    requiresNda: false,
    prizeAmount: 10000,
    controls: {
      exportClassification: 'public-ear99-confirmed',
      dataUseAgreement: true,
      dataRoomAccessLog: true,
      ndaWorkflow: true,
      payoutSanctionsScreening: true,
    },
  },
};
