module.exports = {
  id: "editor-room-ms-042",
  checkedAt: "2026-05-30T19:30:00.000Z",
  sections: [
    {
      id: "methods",
      locked: true,
      lockReason: "final-review",
      markers: ["fn-1", "fn-2"]
    },
    {
      id: "results",
      locked: false,
      markers: ["fn-2", "fn-3", "fn-5"]
    },
    {
      id: "discussion",
      locked: false,
      markers: []
    }
  ],
  notes: [
    {
      id: "fn-1",
      sectionId: "methods",
      text: "Protocol preregistration details.",
      visibility: "public",
      owner: "author-a",
      requiresCitation: true,
      citationKey: "doe2026protocol",
      exportedOrder: 1,
      modifiedAfterLock: false
    },
    {
      id: "fn-2",
      sectionId: "methods",
      text: "Reviewer-only note about the assay batch.",
      visibility: "private",
      owner: "reviewer-7",
      requiresCitation: false,
      exportedOrder: 3,
      modifiedAfterLock: true
    },
    {
      id: "fn-3",
      sectionId: "results",
      text: "Derived from the instrument calibration record.",
      visibility: "public",
      owner: "author-b",
      requiresCitation: true,
      citationKey: "",
      exportedOrder: 2,
      modifiedAfterLock: false
    },
    {
      id: "fn-4",
      sectionId: "discussion",
      text: "Unused historical note from an earlier draft.",
      visibility: "public",
      owner: "author-c",
      requiresCitation: false,
      exportedOrder: 4,
      modifiedAfterLock: false
    }
  ]
};
