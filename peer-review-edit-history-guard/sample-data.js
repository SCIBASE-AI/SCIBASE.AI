const sampleReviewBatch = {
  id: "scibase-prehg-demo",
  projectId: "project-microglia-atlas",
  policy: {
    editWindowHours: 24,
    maxScoreDeltaWithoutSteward: 1.0,
    freezeAfterAuthorResponse: true,
    requireReasonForReputationImpact: true
  },
  reviews: [
    {
      id: "review-101",
      reviewerId: "reviewer-a",
      visibility: "public",
      submittedAt: "2026-05-18T09:00:00Z",
      authorRespondedAt: "2026-05-18T15:20:00Z",
      versions: [
        {
          version: 1,
          editedAt: "2026-05-18T09:00:00Z",
          editorId: "reviewer-a",
          clarity: 4,
          rigor: 4,
          novelty: 3,
          reproducibility: 4,
          comment: "Strong dataset release, but the notebook rerun instructions need a seed note.",
          reason: "initial review"
        },
        {
          version: 2,
          editedAt: "2026-05-18T10:35:00Z",
          editorId: "reviewer-a",
          clarity: 4,
          rigor: 4,
          novelty: 3,
          reproducibility: 5,
          comment: "Strong dataset release after the authors clarified the rerun seed.",
          reason: "minor clarification"
        }
      ]
    },
    {
      id: "review-202",
      reviewerId: "reviewer-b",
      visibility: "double_blind",
      submittedAt: "2026-05-18T11:00:00Z",
      authorRespondedAt: "2026-05-18T13:00:00Z",
      versions: [
        {
          version: 1,
          editedAt: "2026-05-18T11:00:00Z",
          editorId: "reviewer-b",
          clarity: 3,
          rigor: 3,
          novelty: 4,
          reproducibility: 3,
          comment: "Useful method comparison, but artifact checksums are missing.",
          reason: "initial review"
        },
        {
          version: 2,
          editedAt: "2026-05-21T12:30:00Z",
          editorId: "reviewer-b",
          clarity: 5,
          rigor: 5,
          novelty: 5,
          reproducibility: 5,
          comment: "I now think this should receive every reputation badge immediately.",
          reason: "updated after private message"
        }
      ]
    },
    {
      id: "review-303",
      reviewerId: "reviewer-c",
      visibility: "semi_private",
      submittedAt: "2026-05-18T12:00:00Z",
      versions: [
        {
          version: 1,
          editedAt: "2026-05-18T12:00:00Z",
          editorId: "reviewer-c",
          clarity: 5,
          rigor: 4,
          novelty: 4,
          reproducibility: 4,
          comment: "The protocol is clear and the dataset manifest is reusable.",
          reason: "initial review"
        },
        {
          version: 2,
          editedAt: "2026-05-18T14:00:00Z",
          editorId: "reviewer-c",
          clarity: 5,
          rigor: 4,
          novelty: 4,
          reproducibility: 4,
          comment: "The protocol is clear; contact me at reviewer-c@example.invalid for details.",
          reason: ""
        }
      ]
    },
    {
      id: "comment-404",
      reviewerId: "reviewer-d",
      visibility: "anonymous",
      submittedAt: "2026-05-18T12:30:00Z",
      versions: [
        {
          version: 1,
          editedAt: "2026-05-18T12:30:00Z",
          editorId: "reviewer-d",
          clarity: 4,
          rigor: 4,
          novelty: 4,
          reproducibility: 4,
          comment: "Inline comment: please cite the data dictionary near Table 2.",
          reason: "initial inline comment"
        },
        {
          version: 2,
          editedAt: "2026-05-18T13:10:00Z",
          editorId: "project-owner",
          clarity: 4,
          rigor: 4,
          novelty: 4,
          reproducibility: 4,
          comment: "Inline comment resolved by project owner.",
          reason: "owner edited reviewer comment"
        }
      ]
    }
  ]
};

module.exports = { sampleReviewBatch };
