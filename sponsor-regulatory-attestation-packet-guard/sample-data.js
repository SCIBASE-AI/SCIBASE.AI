"use strict";

const digestA = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const digestB = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const digestC = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
const digestD = "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";

module.exports = {
  generatedAt: "2026-06-01T00:00:00.000Z",
  challenges: [
    {
      id: "challenge-open-neuro-imaging",
      title: "Open Neuro Imaging Benchmark Prize",
      sponsor: {
        displayName: "Atlas Neuro Collective",
        legalName: "Atlas Neuro Collective Foundation",
        entityIdentifier: "JP-NPO-000421",
        jurisdiction: "JP",
        authorizedSigner: {
          name: "Mika Sato",
          role: "Director of Research Programs",
          authorityDigest: digestA
        }
      },
      prize: { amountUsd: 500 },
      expectedPayoutJurisdictions: ["JP"],
      funding: {
        sourceOfFundsAttested: true,
        statementDigest: digestB,
        attestedAt: "2026-05-20T00:00:00.000Z"
      },
      sanctionsScreening: {
        status: "clear",
        reference: "SCR-2026-NEURO-001",
        checkedAt: "2026-05-29T00:00:00.000Z",
        beneficialOwners: [
          { id: "owner-foundation-board", role: "board", sanctionsHit: false }
        ]
      },
      taxReporting: {
        formStatus: "not_applicable",
        withholdingReviewComplete: true
      },
      exportControl: {
        classification: "exempt",
        internationalParticipation: false
      },
      publicTerms: {
        rulesDigest: digestC,
        cancellationPolicy: "published",
        refundPolicy: "published"
      },
      complianceContact: { email: "compliance@example.test" }
    },
    {
      id: "challenge-catalyst-literature",
      title: "Cross-border Catalyst Literature Review",
      sponsor: {
        displayName: "Materials Insight Lab",
        legalName: "Materials Insight Lab LLC",
        entityIdentifier: "US-DE-880011",
        jurisdiction: "US",
        authorizedSigner: {
          name: "J. Morgan",
          role: "Chief Scientist",
          authorityDigest: digestA
        }
      },
      prize: { amountUsd: 900 },
      expectedPayoutJurisdictions: ["US", "DE"],
      funding: {
        sourceOfFundsAttested: true,
        statementDigest: digestB,
        attestedAt: "2026-02-01T00:00:00.000Z"
      },
      sanctionsScreening: {
        status: "review",
        reference: "SCR-2026-MAT-019",
        checkedAt: "2026-04-01T00:00:00.000Z",
        beneficialOwners: [
          { id: "owner-mil-1", role: "member", sanctionsHit: false }
        ]
      },
      taxReporting: {
        formStatus: "complete",
        reportingPlanDigest: digestD,
        withholdingReviewComplete: true
      },
      exportControl: {
        classification: "unknown",
        internationalParticipation: true
      },
      publicTerms: {
        rulesDigest: digestC,
        cancellationPolicy: "published"
      }
    },
    {
      id: "challenge-clinical-proteomics",
      title: "Clinical Proteomics Translational Prize",
      sponsor: {
        displayName: "Proteomics Venture Studio",
        legalName: "Proteomics Venture Studio Inc.",
        entityIdentifier: "US-CA-772210",
        jurisdiction: "US",
        authorizedSigner: {
          name: "Lena Ortiz",
          role: "VP Programs",
          authorityDigest: digestA
        }
      },
      prize: { amountUsd: 2500 },
      expectedPayoutJurisdictions: ["US", "IN", "BR"],
      funding: {
        sourceOfFundsAttested: false,
        attestedAt: "2026-05-25T00:00:00.000Z"
      },
      sanctionsScreening: {
        status: "blocked",
        reference: "SCR-2026-CLIN-007",
        checkedAt: "2026-05-28T00:00:00.000Z",
        beneficialOwners: [
          { id: "owner-pvs-2", role: "fund administrator", sanctionsHit: true }
        ]
      },
      taxReporting: {
        formStatus: "missing",
        withholdingReviewComplete: false
      },
      exportControl: {
        classification: "ear99",
        internationalParticipation: true,
        participationControlsDigest: digestD
      },
      regulatedDomain: true,
      publicTerms: {
        rulesDigest: digestC,
        cancellationPolicy: "published",
        refundPolicy: "published"
      },
      complianceContact: { email: "legal@example.test" }
    },
    {
      id: "challenge-dual-use-sensors",
      title: "Dual-use Sensor Fusion Model Challenge",
      sponsor: {
        displayName: "Frontier Robotics Initiative",
        legalName: "Frontier Robotics Initiative",
        entityIdentifier: "GB-CIC-441200",
        jurisdiction: "GB",
        authorizedSigner: {
          name: "Priya Shah",
          role: "Managing Director",
          authorityDigest: digestA
        }
      },
      prize: { amountUsd: 1200 },
      expectedPayoutJurisdictions: ["GB", "US"],
      funding: {
        sourceOfFundsAttested: true,
        statementDigest: digestB,
        attestedAt: "2026-05-18T00:00:00.000Z",
        thirdPartySponsor: true
      },
      sanctionsScreening: {
        status: "clear",
        reference: "SCR-2026-ROBO-009",
        checkedAt: "2026-05-30T00:00:00.000Z",
        beneficialOwners: [
          { id: "owner-fri-1", role: "director", sanctionsHit: false }
        ]
      },
      taxReporting: {
        formStatus: "complete",
        reportingPlanDigest: digestD,
        withholdingReviewComplete: true
      },
      exportControl: {
        classification: "dual-use-restricted",
        internationalParticipation: true
      },
      publicTerms: {
        rulesDigest: "draft",
        cancellationPolicy: "published",
        refundPolicy: "published"
      },
      complianceContact: { email: "controls@example.test" }
    }
  ]
};
