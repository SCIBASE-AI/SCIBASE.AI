const samplePacket = {
  projectId: "scibase-neuro-open-review-42",
  generatedAt: "2026-05-21T09:00:00.000Z",
  reviews: [
    {
      id: "review-toxic-001",
      mode: "public",
      reviewer: {
        displayName: "Dr. Asha Raman",
        handle: "araman",
        institution: "Northbridge Lab"
      },
      title: "Major reproducibility concern",
      summary:
        "The analysis labels the authors as fraud and says their career is over without citing a specific artifact reference.",
      body:
        "The reproducibility score is 1 because this is fake scientist behavior. This should not affect reputation until a moderator requires evidence.",
      scores: {
        clarity: 3,
        rigor: 1,
        novelty: 4,
        reproducibility: 1
      }
    },
    {
      id: "review-blind-leak-002",
      mode: "double_blind",
      reviewer: {
        displayName: "Prof. Elena Moor",
        handle: "emoor",
        institution: "Lakeview Institute"
      },
      title: "Blind review with identity leak",
      summary:
        "As Prof. Elena Moor from Lakeview Institute, I can confirm the protocol is underpowered.",
      body:
        "The critique references Figure 2 and notebook cell A14, but the self-identification breaks double-blind review mode.",
      scores: {
        clarity: 4,
        rigor: 2,
        novelty: 3,
        reproducibility: 2
      }
    },
    {
      id: "review-clean-003",
      mode: "semi_private",
      reviewer: {
        displayName: "Reviewer 12",
        handle: "reviewer12",
        institution: "Hidden"
      },
      title: "Actionable replication note",
      summary:
        "Rigor score is lowered because Figure 4 and notebook cell B7 disagree on the normalization constant.",
      body:
        "The review is specific, evidence-anchored, and avoids personal claims. It should be safe for author-visible publication.",
      scores: {
        clarity: 4,
        rigor: 2,
        novelty: 4,
        reproducibility: 3
      }
    }
  ],
  comments: [
    {
      id: "comment-private-001",
      body:
        "Please redact the personal email and visa status note before this appears on the project timeline.",
      anchor: {
        artifactId: "dataset-cleaning-log",
        line: 88
      }
    },
    {
      id: "comment-anchor-002",
      body: "Needs more detail on the preprocessing step.",
      anchor: null
    },
    {
      id: "comment-clean-003",
      body: "Notebook cell C12 clarifies the missing unit conversion.",
      anchor: {
        artifactId: "analysis-notebook",
        cell: "C12"
      }
    }
  ]
};

const cleanPacket = {
  projectId: "scibase-clean-review-7",
  generatedAt: "2026-05-21T09:05:00.000Z",
  reviews: [
    {
      id: "review-clean-pass-001",
      mode: "public",
      reviewer: {
        displayName: "Reviewer 8",
        handle: "reviewer8"
      },
      title: "Specific reproducibility improvement",
      summary:
        "Table 2 and commit 9f2ab41 show a preprocessing mismatch; scores should be author-visible with no reputation block.",
      body:
        "The note is evidence-based and avoids personal or protected identity claims.",
      scores: {
        clarity: 4,
        rigor: 3,
        novelty: 4,
        reproducibility: 3
      }
    }
  ],
  comments: [
    {
      id: "comment-clean-pass-001",
      body: "Line 43 should cite the calibration script output.",
      anchor: {
        artifactId: "manuscript",
        line: 43
      }
    }
  ]
};

module.exports = { samplePacket, cleanPacket };
