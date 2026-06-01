const cleanPacket = {
  reviewId: "prisma-living-review-cardiometabolic-ai",
  reviewDate: "2026-06-01",
  maxSearchSnapshotAgeDays: 21,
  minGapEvidenceStudies: 3,
  eligibilityCriteria: {
    version: "eligibility-v3",
    fields: {
      population: "Adults with cardiometabolic risk markers",
      intervention: "AI-assisted remote coaching or monitoring",
      comparator: "Usual care or non-AI digital support",
      outcome: "HbA1c, systolic blood pressure, adherence, or adverse events",
      studyDesign: "Randomized, quasi-experimental, or prospective cohort"
    }
  },
  searchSnapshot: {
    id: "search-2026-05-29-medline-embase",
    capturedAt: "2026-05-29",
    databases: ["MEDLINE", "Embase", "CENTRAL"]
  },
  aiPolicy: {
    actionAuthority: "assist_only",
    humanApprovalRequired: true
  },
  exclusionTaxonomy: [
    {
      id: "outside_population",
      label: "Outside target population"
    },
    {
      id: "wrong_intervention",
      label: "No AI-assisted intervention"
    },
    {
      id: "wrong_outcome",
      label: "No eligible outcome"
    }
  ],
  studies: [
    {
      id: "SR-001",
      title: "Remote AI coaching for cardiometabolic risk",
      criteriaVersion: "eligibility-v3",
      fullTextRequired: true,
      screeningOutcome: "included",
      humanApproved: true,
      decisions: [
        {
          stage: "title_abstract",
          reviewer: "reviewer-a",
          decision: "include"
        },
        {
          stage: "title_abstract",
          reviewer: "reviewer-b",
          decision: "include"
        },
        {
          stage: "full_text",
          reviewer: "reviewer-a",
          decision: "include"
        },
        {
          stage: "full_text",
          reviewer: "reviewer-b",
          decision: "include"
        }
      ],
      consensus: {
        title_abstract: {
          state: "resolved",
          resolution: "include"
        },
        full_text: {
          state: "resolved",
          resolution: "include"
        }
      },
      fullText: {
        retrievedAt: "2026-05-30",
        locator: "s3://review-evidence/sr-001.pdf",
        hash: "sha256:1c9e6c0b1f39"
      },
      aiRecommendations: [
        {
          action: "include",
          authority: "assist_only",
          applied: false
        }
      ],
      reviewerNotes: [
        {
          private: false,
          exportedToAssistant: true,
          text: "Outcome and intervention match eligibility-v3."
        }
      ]
    },
    {
      id: "SR-002",
      title: "Mobile reminders without AI personalization",
      criteriaVersion: "eligibility-v3",
      fullTextRequired: true,
      screeningOutcome: "excluded",
      humanApproved: true,
      decisions: [
        {
          stage: "title_abstract",
          reviewer: "reviewer-c",
          decision: "include"
        },
        {
          stage: "title_abstract",
          reviewer: "reviewer-d",
          decision: "include"
        },
        {
          stage: "full_text",
          reviewer: "reviewer-c",
          decision: "exclude"
        },
        {
          stage: "full_text",
          reviewer: "reviewer-d",
          decision: "exclude"
        }
      ],
      consensus: {
        title_abstract: {
          state: "resolved",
          resolution: "include"
        },
        full_text: {
          state: "resolved",
          resolution: "exclude"
        }
      },
      fullText: {
        retrievedAt: "2026-05-30",
        locator: "s3://review-evidence/sr-002.pdf",
        hash: "sha256:2f58f225abcd"
      },
      exclusionReasons: [
        {
          id: "wrong_intervention",
          evidenceLocator: "page 4, intervention section",
          evidenceQuote: "The reminder cadence was rule-based and did not use AI personalization."
        }
      ],
      aiRecommendations: [
        {
          action: "exclude",
          authority: "assist_only",
          applied: false
        }
      ],
      reviewerNotes: []
    },
    {
      id: "SR-003",
      title: "AI adherence coach in hypertension clinics",
      criteriaVersion: "eligibility-v3",
      fullTextRequired: true,
      screeningOutcome: "included",
      humanApproved: true,
      decisions: [
        {
          stage: "title_abstract",
          reviewer: "reviewer-a",
          decision: "include"
        },
        {
          stage: "title_abstract",
          reviewer: "reviewer-b",
          decision: "include"
        },
        {
          stage: "full_text",
          reviewer: "reviewer-a",
          decision: "include"
        },
        {
          stage: "full_text",
          reviewer: "reviewer-b",
          decision: "include"
        }
      ],
      consensus: {
        title_abstract: {
          state: "resolved",
          resolution: "include"
        },
        full_text: {
          state: "resolved",
          resolution: "include"
        }
      },
      fullText: {
        retrievedAt: "2026-05-31",
        locator: "s3://review-evidence/sr-003.pdf",
        hash: "sha256:3b51f77acdef"
      },
      aiRecommendations: [
        {
          action: "include",
          authority: "assist_only",
          applied: false
        }
      ],
      reviewerNotes: []
    }
  ],
  gapPrompts: [
    {
      id: "gap-underserved-rural-cohorts",
      evidenceStudyIds: ["SR-001", "SR-002", "SR-003"],
      limitationSignals: ["few rural cohorts", "short follow-up windows"],
      includesPrivateReviewerNote: false
    }
  ]
};

const riskyPacket = {
  reviewId: "prisma-living-review-cardiometabolic-ai",
  reviewDate: "2026-06-01",
  maxSearchSnapshotAgeDays: 21,
  minGapEvidenceStudies: 3,
  eligibilityCriteria: {
    version: "eligibility-v3",
    fields: {
      population: "Adults with cardiometabolic risk markers",
      intervention: "AI-assisted remote coaching or monitoring",
      comparator: "Usual care or non-AI digital support"
    }
  },
  searchSnapshot: {
    id: "search-2025-12-01-medline-only",
    capturedAt: "2025-12-01",
    databases: ["MEDLINE"]
  },
  aiPolicy: {
    actionAuthority: "auto_apply",
    humanApprovalRequired: false
  },
  exclusionTaxonomy: [
    {
      id: "outside_population",
      label: "Outside target population"
    },
    {
      id: "wrong_intervention",
      label: "No AI-assisted intervention"
    }
  ],
  studies: [
    {
      id: "SR-100",
      title: "AI lifestyle coaching in adolescent athletes",
      criteriaVersion: "eligibility-v2",
      fullTextRequired: true,
      screeningOutcome: "excluded",
      humanApproved: false,
      decisions: [
        {
          stage: "title_abstract",
          reviewer: "reviewer-a",
          decision: "include"
        },
        {
          stage: "full_text",
          reviewer: "reviewer-a",
          decision: "exclude"
        },
        {
          stage: "full_text",
          reviewer: "reviewer-b",
          decision: "include"
        }
      ],
      consensus: {
        title_abstract: {
          state: "resolved",
          resolution: "include"
        },
        full_text: {
          state: "conflict"
        }
      },
      exclusionReasons: [
        {
          id: "low_quality",
          evidenceLocator: "",
          evidenceQuote: ""
        }
      ],
      aiRecommendations: [
        {
          action: "exclude",
          authority: "auto_apply",
          applied: true
        }
      ],
      reviewerNotes: [
        {
          private: true,
          exportedToAssistant: true,
          text: "Reviewer B disclosed a conflict in a private note."
        }
      ]
    },
    {
      id: "SR-101",
      title: "Duplicate conference abstract for remote monitoring trial",
      criteriaVersion: "eligibility-v3",
      fullTextRequired: true,
      screeningOutcome: "included",
      humanApproved: false,
      duplicateGroup: {
        id: "dup-cluster-77"
      },
      decisions: [
        {
          stage: "title_abstract",
          reviewer: "reviewer-c",
          decision: "include"
        },
        {
          stage: "title_abstract",
          reviewer: "reviewer-d",
          decision: "include"
        },
        {
          stage: "full_text",
          reviewer: "reviewer-c",
          decision: "include"
        }
      ],
      consensus: {
        title_abstract: {
          state: "resolved",
          resolution: "include"
        },
        full_text: {
          state: "resolved",
          resolution: "include"
        }
      },
      fullText: {
        retrievedAt: "2026-05-12",
        locator: "",
        hash: ""
      },
      aiRecommendations: [
        {
          action: "include",
          authority: "assist_only",
          applied: false
        }
      ],
      reviewerNotes: []
    }
  ],
  gapPrompts: [
    {
      id: "gap-adolescent-ai-coaching",
      evidenceStudyIds: ["SR-100"],
      limitationSignals: [],
      includesPrivateReviewerNote: true
    }
  ]
};

module.exports = {
  cleanPacket,
  riskyPacket
};
