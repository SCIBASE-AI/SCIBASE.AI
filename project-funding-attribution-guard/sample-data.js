"use strict";

const project = {
  id: "proj-neuro-air-001",
  title: "Urban air exposure and pediatric neuroinflammation",
  visibility: "public",
  citationMetadata: {
    doi: "",
    title: "Urban air exposure and pediatric neuroinflammation",
    authors: ["Ada Chen", "Luis Ortega", "Mina Patel"],
    institutions: ["North Valley University"],
    fundingAcknowledgement: "Supported by Clean Cities Health Initiative."
  },
  linkedInstitutions: [
    {
      id: "inst-nvu",
      name: "North Valley University",
      role: "lead-institution",
      verifiedDomain: "nvu.example",
      requiresOpenAccessAcknowledgement: true
    },
    {
      id: "inst-bridge",
      name: "Bridge Children's Hospital",
      role: "clinical-partner",
      verifiedDomain: "bridge.example",
      requiresOpenAccessAcknowledgement: false
    }
  ],
  fundingSources: [
    {
      id: "grant-clean-cities",
      funder: "Clean Cities Health Initiative",
      grantId: "CCHI-2026-118",
      requiredText: "Clean Cities Health Initiative",
      requiresDoiBeforePublication: true,
      publicAcknowledgementRequired: true
    },
    {
      id: "grant-pediatric-data",
      funder: "Pediatric Data Commons",
      grantId: "",
      requiredText: "Pediatric Data Commons",
      requiresDoiBeforePublication: false,
      publicAcknowledgementRequired: true
    }
  ],
  collaborators: [
    {
      id: "u-ada",
      name: "Ada Chen",
      role: "owner",
      institutionId: "inst-nvu",
      emailDomain: "nvu.example",
      orcidLinked: true,
      publicProfile: true
    },
    {
      id: "u-luis",
      name: "Luis Ortega",
      role: "contributor",
      institutionId: "inst-bridge",
      emailDomain: "bridge.example",
      orcidLinked: false,
      publicProfile: true
    },
    {
      id: "u-mina",
      name: "Mina Patel",
      role: "reviewer",
      institutionId: "inst-nvu",
      emailDomain: "personal.example",
      orcidLinked: true,
      publicProfile: false
    }
  ],
  auditEvents: [
    {
      id: "ae-1",
      actorId: "u-ada",
      action: "linked-funder",
      targetId: "grant-clean-cities",
      createdAt: "2026-05-01T12:00:00Z"
    },
    {
      id: "ae-2",
      actorId: "u-ada",
      action: "added-institution",
      targetId: "inst-nvu",
      createdAt: "2026-05-02T12:00:00Z"
    },
    {
      id: "ae-3",
      actorId: "u-luis",
      action: "updated-profile",
      targetId: "u-luis",
      createdAt: "2026-05-03T12:00:00Z"
    }
  ]
};

module.exports = {
  project
};
