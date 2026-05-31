module.exports = {
  documentId: "manuscript-editor-309",
  fromMode: "wysiwyg",
  toMode: "markdown",
  before: [
    {
      id: "methods-p2",
      locked: true,
      contentHash: "hash-before-methods",
      equations: ["eq-growth-rate"],
      citations: ["lee2026assay", "patel2025model"],
      notebookLinks: ["cell-fit-12"],
      commentAnchors: ["cmt-44"],
      suggestionIds: ["sug-91"]
    },
    {
      id: "results-p1",
      locked: false,
      contentHash: "hash-results",
      equations: [],
      citations: ["nguyen2024dataset"],
      notebookLinks: ["cell-plot-3"],
      commentAnchors: [],
      suggestionIds: []
    }
  ],
  after: [
    {
      id: "methods-p2",
      locked: true,
      contentHash: "hash-after-methods",
      equations: [],
      citations: ["lee2026assay"],
      notebookLinks: [],
      commentAnchors: [],
      suggestionIds: [],
      lockOwnerApprovalId: ""
    },
    {
      id: "results-p1",
      locked: false,
      contentHash: "hash-results",
      equations: [],
      citations: ["nguyen2024dataset"],
      notebookLinks: ["cell-plot-3"],
      commentAnchors: [],
      suggestionIds: []
    }
  ]
};
