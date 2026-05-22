const holdPacket = {
  reviewDate: "2026-05-22",
  challenge: {
    id: "CH-HUMAN-042",
    title: "Predictive sepsis marker challenge",
    visibility: "public",
    involvesHumanParticipants: true,
    participantGroups: ["adults", "icu-patients"],
    regulations: ["HIPAA", "GDPR"],
    evaluationEndsAt: "2026-06-30",
  },
  submission: {
    id: "SUB-TEAM-17",
    title: "Multisite ICU biomarker model",
    teamId: "team-neon",
    ethicsApproval: {
      status: "pending",
      protocolId: "",
      expiresAt: "2026-07-15",
      vulnerablePopulationReview: false,
    },
    consent: {
      formId: "CONSENT-ICU-1",
      coveredGroups: ["adults"],
      allowsPrizeChallengeUse: false,
      withdrawalWindowOpen: true,
    },
    artifacts: [
      {
        id: "DATA-RAW-1",
        label: "Raw ICU encounter extract",
        type: "dataset",
        humanSubjectData: true,
        privacyLevel: "raw",
        checksum: "",
        directIdentifiersPresent: true,
        reidentificationRisk: "high",
      },
      {
        id: "MODEL-1",
        label: "Sepsis marker notebook",
        type: "notebook",
        humanSubjectData: false,
        checksum: "sha256:8c58b7d47b5d0e6f",
      },
    ],
    rewardAndIp: {
      payoutBeforeCompliance: true,
      ipReleaseBeforeCompliance: true,
      sponsorAcknowledgedComplianceHold: false,
    },
  },
  reviewers: [
    {
      id: "REV-1",
      name: "Clinical reviewer",
      humanSubjectsTrainingCurrent: false,
      conflictDeclarationSigned: false,
      access: ["raw-data", "model"],
      accessExpiresAt: "2026-06-01",
    },
  ],
  regulatoryControls: {
    hipaaMinimumNecessary: false,
    lawfulBasis: "",
    crossBorderTransfer: true,
    transferMechanism: "",
    dataUseAgreementId: "",
    privacyContact: "",
  },
};

const readyPacket = {
  reviewDate: "2026-05-22",
  challenge: {
    id: "CH-HUMAN-043",
    title: "Aggregate sleep-stage reproducibility challenge",
    visibility: "private",
    involvesHumanParticipants: true,
    participantGroups: ["adults"],
    regulations: ["HIPAA"],
    evaluationEndsAt: "2026-06-15",
  },
  submission: {
    id: "SUB-TEAM-21",
    title: "Aggregate actigraphy reproducibility package",
    teamId: "team-circadian",
    ethicsApproval: {
      status: "approved",
      protocolId: "IRB-2026-118",
      expiresAt: "2026-12-31",
      vulnerablePopulationReview: true,
    },
    consent: {
      formId: "CONSENT-SLEEP-2",
      coveredGroups: ["adults"],
      allowsPrizeChallengeUse: true,
      withdrawalWindowOpen: false,
    },
    artifacts: [
      {
        id: "DATA-AGG-1",
        label: "Aggregate sleep-stage feature table",
        type: "dataset",
        humanSubjectData: true,
        privacyLevel: "aggregate",
        checksum: "sha256:cbfbac91074d0afe",
        directIdentifiersPresent: false,
        reidentificationRisk: "low",
      },
    ],
    rewardAndIp: {
      payoutBeforeCompliance: false,
      ipReleaseBeforeCompliance: false,
      sponsorAcknowledgedComplianceHold: true,
    },
  },
  reviewers: [
    {
      id: "REV-2",
      name: "Privacy reviewer",
      humanSubjectsTrainingCurrent: true,
      conflictDeclarationSigned: true,
      access: ["aggregate-data", "model"],
      accessExpiresAt: "2026-07-01",
    },
  ],
  regulatoryControls: {
    hipaaMinimumNecessary: true,
    dataUseAgreementId: "DUA-SCIBASE-2026-04",
    privacyContact: "privacy-review@example.org",
  },
};

const reviewPacket = {
  reviewDate: "2026-05-22",
  challenge: {
    id: "CH-HUMAN-044",
    title: "Patient-reported outcome pilot",
    visibility: "private",
    involvesHumanParticipants: true,
    participantGroups: ["adults"],
    regulations: ["GDPR"],
    evaluationEndsAt: "2026-06-20",
  },
  submission: {
    id: "SUB-TEAM-33",
    title: "Deidentified PRO feature summary",
    teamId: "team-privacy",
    ethicsApproval: {
      status: "exempt",
      protocolId: "EXEMPT-77",
      expiresAt: "2026-06-10",
      vulnerablePopulationReview: true,
    },
    consent: {
      waiverId: "WAIVER-77",
      coveredGroups: ["adults"],
      allowsPrizeChallengeUse: true,
      withdrawalWindowOpen: false,
    },
    artifacts: [
      {
        id: "DATA-DEID-3",
        label: "Deidentified survey feature table",
        type: "dataset",
        humanSubjectData: true,
        privacyLevel: "deidentified",
        checksum: "sha256:d0f4ac35b8a98577",
        directIdentifiersPresent: false,
        reidentificationRisk: "medium",
      },
    ],
    rewardAndIp: {
      payoutBeforeCompliance: false,
      ipReleaseBeforeCompliance: false,
      sponsorAcknowledgedComplianceHold: true,
    },
  },
  reviewers: [
    {
      id: "REV-3",
      name: "EU data reviewer",
      humanSubjectsTrainingCurrent: true,
      conflictDeclarationSigned: true,
      access: ["deidentified-data"],
      accessExpiresAt: "2026-06-30",
    },
  ],
  regulatoryControls: {
    lawfulBasis: "research task in public interest",
    crossBorderTransfer: true,
    transferMechanism: "standard contractual clauses",
    dataUseAgreementId: "DPA-2026-77",
    privacyContact: "dpo@example.org",
  },
};

module.exports = {
  holdPacket,
  readyPacket,
  reviewPacket,
};
