const suggestionBatch = {
  id: "suggestion-provenance-2026-05-29",
  generatedAt: "2026-05-29T14:02:00.000Z",
  suggestions: [
    {
      id: "sug-1",
      documentId: "manuscript-v3",
      sectionId: "methods-2",
      authorId: "reviewer-ana",
      authorVisible: true,
      mode: "public-review",
      targetRangeHash: "range:8a12",
      currentRangeHash: "range:8a12",
      permission: "reviewer",
      acceptedBy: "author-mika",
      lineage: ["draft-v2", "review-round-1"]
    },
    {
      id: "sug-2",
      documentId: "manuscript-v3",
      sectionId: "results-4",
      authorId: "reviewer-bao",
      authorVisible: true,
      mode: "anonymous-review",
      targetRangeHash: "range:9011",
      currentRangeHash: "range:9011",
      permission: "reviewer",
      acceptedBy: null,
      lineage: ["draft-v3"]
    },
    {
      id: "sug-3",
      documentId: "manuscript-v3",
      sectionId: "figure-caption-2",
      authorId: "external-lee",
      authorVisible: true,
      mode: "public-review",
      targetRangeHash: "range:4f00",
      currentRangeHash: "range:7b12",
      permission: "commenter",
      acceptedBy: "author-mika",
      lineage: []
    },
    {
      id: "sug-4",
      documentId: "protocol-v1",
      sectionId: "sampling-step-5",
      authorId: "reviewer-nia",
      authorVisible: false,
      mode: "anonymous-review",
      targetRangeHash: "range:cc19",
      currentRangeHash: "range:cc19",
      permission: "reviewer",
      acceptedBy: "protocol-owner",
      lineage: ["protocol-v0", "review-round-2"]
    }
  ]
};

module.exports = { suggestionBatch };
