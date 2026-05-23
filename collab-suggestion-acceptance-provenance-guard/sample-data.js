const policy = {
  maxNotebookAgeMinutes: 180,
  maxAnchorDrift: 4,
}

const manuscripts = [
  {
    manuscriptId: "immune-response-manuscript",
    title: "Immune Response Manuscript",
    authors: [
      { authorId: "author-lee", role: "corresponding_author" },
      { authorId: "author-garcia", role: "coauthor" },
      { authorId: "author-shah", role: "statistician" },
    ],
    sections: [
      {
        sectionId: "results-primary",
        type: "results",
        currentHash: "sha256-results-v12",
        lock: { mode: "submission_freeze", ownerId: "author-lee" },
        text: "Treatment reduced IL-6 by 18 percent while CRP remained unchanged in the adjusted model.",
      },
      {
        sectionId: "methods-assay",
        type: "methods",
        currentHash: "sha256-methods-v4",
        lock: null,
        text: "Samples were processed with a multiplex assay and normalized by batch.",
      },
    ],
    notebookOutputs: [
      {
        notebookId: "nb-il6-model",
        status: "fresh",
        executedAt: "2026-05-23T19:10:00.000Z",
      },
      {
        notebookId: "nb-crp-sensitivity",
        status: "stale",
        executedAt: "2026-05-22T18:00:00.000Z",
      },
    ],
    comments: [
      {
        commentId: "comment-101",
        suggestionId: "sug-safe-il6-wording",
        status: "resolved",
        blocking: true,
      },
      {
        commentId: "comment-202",
        suggestionId: "sug-stale-methods-anchor",
        status: "open",
        blocking: true,
      },
    ],
    suggestions: [
      {
        suggestionId: "sug-safe-il6-wording",
        proposerId: "author-garcia",
        sectionId: "results-primary",
        baseSectionHash: "sha256-results-v12",
        quote: "Treatment reduced IL-6 by 18 percent",
        anchorStart: 0,
        replacement: "Treatment reduced IL-6 by 18 percent in the adjusted model",
        relatedNotebookIds: ["nb-il6-model"],
        lockOverride: {
          approved: true,
          sectionHash: "sha256-results-v12",
          reason: "submission freeze allows corresponding-author approved wording fix",
        },
        approvals: [
          { authorId: "author-lee", status: "approved", approvedAt: "2026-05-23T20:00:00.000Z" },
        ],
      },
      {
        suggestionId: "sug-stale-crp-result",
        proposerId: "author-shah",
        sectionId: "results-primary",
        baseSectionHash: "sha256-results-v12",
        quote: "CRP remained unchanged",
        anchorStart: 43,
        replacement: "CRP showed a sensitivity-model increase",
        relatedNotebookIds: ["nb-crp-sensitivity"],
        lockOverride: {
          approved: true,
          sectionHash: "sha256-results-v12",
          reason: "statistics team update",
        },
        approvals: [
          { authorId: "author-lee", status: "approved", approvedAt: "2026-05-23T20:20:00.000Z" },
        ],
      },
      {
        suggestionId: "sug-stale-methods-anchor",
        proposerId: "author-garcia",
        sectionId: "methods-assay",
        baseSectionHash: "sha256-methods-v3",
        quote: "singleplex assay",
        anchorStart: 28,
        replacement: "multiplex cytokine assay",
        relatedNotebookIds: [],
        approvals: [
          { authorId: "author-garcia", status: "approved", approvedAt: "2026-05-23T20:30:00.000Z" },
        ],
      },
    ],
  },
  {
    manuscriptId: "materials-catalyst-draft",
    title: "Materials Catalyst Draft",
    authors: [
      { authorId: "author-kim", role: "corresponding_author" },
      { authorId: "author-owens", role: "coauthor" },
    ],
    sections: [
      {
        sectionId: "discussion",
        type: "discussion",
        currentHash: "sha256-discussion-v7",
        lock: null,
        text: "The catalyst remained stable through ten cycles with a modest activity decline.",
      },
    ],
    notebookOutputs: [],
    comments: [],
    suggestions: [
      {
        suggestionId: "sug-discussion-precision",
        proposerId: "author-owens",
        sectionId: "discussion",
        baseSectionHash: "sha256-discussion-v7",
        quote: "modest activity decline",
        anchorStart: 58,
        replacement: "4.2 percent activity decline",
        relatedNotebookIds: [],
        approvals: [
          { authorId: "author-kim", status: "approved", approvedAt: "2026-05-23T20:05:00.000Z" },
        ],
      },
    ],
  },
]

module.exports = {
  policy,
  manuscripts,
}
