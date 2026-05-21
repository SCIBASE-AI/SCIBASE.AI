"use strict";

const challenge = {
  id: "SCI-BIO-042",
  title: "Identify reproducible single-cell biomarker panels",
  visibility: "private",
  awardAnnouncementAt: "2026-06-29T16:00:00.000Z",
  payoutReleaseAt: "2026-06-30T12:00:00.000Z",
  sourceManifestDigest: "sha256:7cc8d7b79afda5c89215e89e4dd52b46357f6cb787df3e8ef7726f3f2cbd9a10",
  sponsor: {
    name: "North Bridge Translational Fund",
    contact: "programs@example.org",
  },
  rubric: [
    { id: "scientific_validity", label: "Scientific validity", weight: 40 },
    { id: "reproducibility", label: "Reproducibility evidence", weight: 35 },
    { id: "clinical_utility", label: "Clinical utility", weight: 25 },
  ],
  reviewers: [
    {
      id: "rev-methods",
      role: "methods reviewer",
      conflictStatus: "none",
      disclosureSummary: "No sponsor, solver, or institutional conflicts declared.",
    },
    {
      id: "rev-clinical",
      role: "clinical reviewer",
      conflictStatus: "managed",
      disclosureSummary: "Former collaborator disclosed; recused from Helix Guild clinical utility score.",
    },
    {
      id: "rev-repro",
      role: "reproducibility reviewer",
      conflictStatus: "none",
      disclosureSummary: "No conflicts declared.",
    },
  ],
  submissions: [
    {
      id: "sub-alpha",
      teamName: "Northstar Lab",
      institution: "Northstar University",
      publicIdentityConsent: true,
      awardPublicConsent: true,
      unpaidIpSensitive: false,
    },
    {
      id: "sub-beta",
      teamName: "Helix Guild",
      institution: "Independent solver collective",
      publicIdentityConsent: false,
      awardPublicConsent: false,
      unpaidIpSensitive: true,
    },
    {
      id: "sub-gamma",
      teamName: "Cedar Analytics",
      institution: "Cedar Analytics LLC",
      publicIdentityConsent: true,
      awardPublicConsent: true,
      unpaidIpSensitive: false,
    },
  ],
  finalResults: [
    {
      submissionId: "sub-alpha",
      rank: 1,
      awardUsd: 650,
      payoutStatus: "queued",
      ipTransferRequested: true,
      totalScore: 91.85,
      scoreBreakdown: {
        scientific_validity: 94,
        reproducibility: 90,
        clinical_utility: 91,
      },
      rationale: "Best validated marker panel with complete reproducibility package.",
    },
    {
      submissionId: "sub-beta",
      rank: 2,
      awardUsd: 250,
      payoutStatus: "queued",
      ipTransferRequested: false,
      totalScore: 84.15,
      scoreBreakdown: {
        scientific_validity: 88,
        reproducibility: 82,
        clinical_utility: 81,
      },
      rationale: "Strong exploratory biology with private solver identity retained.",
    },
    {
      submissionId: "sub-gamma",
      rank: 3,
      awardUsd: 100,
      payoutStatus: "queued",
      ipTransferRequested: false,
      totalScore: 77.85,
      scoreBreakdown: {
        scientific_validity: 78,
        reproducibility: 79,
        clinical_utility: 76,
      },
      rationale: "Useful honorable mention with a clean result package.",
    },
  ],
  escrow: {
    status: "cleared",
    clearedUsd: 1000,
    currency: "USD",
    provider: "platform_escrow",
  },
  appeals: {
    opensAt: "2026-06-26T16:00:00.000Z",
    closesAt: "2026-06-29T20:00:00.000Z",
    pendingCount: 0,
    policyUrl: "https://scibase.example/policies/challenge-appeals",
  },
  notifications: [
    {
      submissionId: "sub-alpha",
      type: "award_result",
      sentAt: "2026-06-29T14:00:00.000Z",
      channel: "platform_and_email",
      includesAppealInstructions: true,
    },
    {
      submissionId: "sub-beta",
      type: "award_result",
      sentAt: "2026-06-29T14:05:00.000Z",
      channel: "platform_and_email",
      includesAppealInstructions: true,
    },
    {
      submissionId: "sub-gamma",
      type: "award_result",
      sentAt: "2026-06-29T14:10:00.000Z",
      channel: "platform_and_email",
      includesAppealInstructions: true,
    },
  ],
  publicPreviewArtifacts: [
    {
      id: "artifact-alpha-summary",
      submissionId: "sub-alpha",
      label: "public winner summary",
      redacted: false,
      digest: "sha256:alpha-summary",
    },
    {
      id: "artifact-beta-methods-preview",
      submissionId: "sub-beta",
      label: "redacted private finalist methods preview",
      redacted: true,
      digest: "sha256:beta-redacted-preview",
    },
  ],
  ipPolicy: {
    default: "solver_retains_until_paid",
    transferTrigger: "authorized_payout",
  },
};

module.exports = { challenge };
