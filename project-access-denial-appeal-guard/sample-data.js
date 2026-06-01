"use strict";

const cleanPacket = {
  id: "clean-access-appeals",
  accessRequests: [
    {
      id: "AR-1001",
      requester: {
        id: "researcher-42",
        institution: "Northeast Medical Lab",
        orcidVerified: true,
        mfaFresh: true
      },
      project: {
        id: "proj-human-cohort-7",
        classification: "restricted_human",
        visibility: "institutional-only"
      },
      requestedObjects: [
        {
          id: "dataset-redacted-v2",
          path: "data/redacted-cohort-v2.csv",
          permission: "download",
          classification: "restricted_human"
        },
        {
          id: "notebook-analysis",
          path: "notebooks/reproduce.ipynb",
          permission: "read",
          classification: "institutional_only"
        }
      ],
      denial: {
        deniedAt: "2026-05-20T12:00:00.000Z",
        deniedBy: "steward-a",
        reasonCode: "IRB_SCOPE_REVIEW_REQUIRED",
        rationale: "The requested cohort export needs an IRB scope check before download access can be granted.",
        outcome: "deny-with-remediation",
        privateNotes: "Internal reviewer note: contact PI before export.",
        redactedForRequester: true
      },
      appeal: {
        submittedAt: "2026-05-24T09:00:00.000Z",
        reviewerId: "ethics-reviewer-b",
        reviewerRole: "ethics-reviewer",
        decision: "uphold-denial",
        rationale: "Appeal reviewed. Access remains denied until the amended IRB letter is attached.",
        redactedForRequester: true,
        evidence: {
          trainingValid: true,
          duaActive: true,
          irbApproval: true
        }
      },
      auditReceipt: {
        userFacingNotice: true,
        fields: ["reasonCode", "appealDeadline", "evidenceChecklist", "decisionTimestamp", "appealOutcome", "reviewerRole"]
      }
    }
  ]
};

const riskyPacket = {
  id: "risky-access-appeals",
  accessRequests: [
    {
      id: "AR-2002",
      requester: {
        id: "researcher-99",
        institution: "External Partner Lab",
        orcidVerified: false,
        mfaFresh: false
      },
      project: {
        id: "proj-human-cohort-9",
        classification: "restricted_human",
        visibility: "invitation-only"
      },
      requestedObjects: [
        {
          id: "all-project",
          path: "*",
          scope: "all-project",
          permission: "download",
          classification: "restricted_human"
        }
      ],
      denial: {
        deniedAt: "2026-05-01T12:00:00.000Z",
        deniedBy: "steward-a",
        reasonCode: "",
        rationale: "No.",
        privateNotes: "Private: reviewer suspects a competing project conflict.",
        redactedForRequester: false
      },
      appeal: {
        submittedAt: "2026-05-25T09:00:00.000Z",
        reviewerId: "steward-a",
        reviewerRole: "viewer",
        decision: "approve",
        rationale: "Approved after appeal.",
        privateNotes: "Internal note: sponsor did not respond.",
        redactedForRequester: false,
        evidence: {
          trainingValid: true,
          duaActive: false,
          irbApproval: false
        }
      },
      auditReceipt: {
        userFacingNotice: false,
        fields: ["decisionTimestamp"]
      }
    }
  ]
};

module.exports = {
  cleanPacket,
  riskyPacket
};
