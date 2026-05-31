module.exports = {
  id: "editor-room-chat-118",
  users: [
    { id: "u-author", displayName: "Dr. Author", role: "author", external: false },
    { id: "u-stat", displayName: "Dr. Statistician", role: "collaborator", external: false },
    { id: "u-reviewer", displayName: "Reviewer B", role: "blinded-reviewer", external: false },
    { id: "u-contractor", displayName: "External Analyst", role: "collaborator", external: true }
  ],
  sections: [
    {
      id: "methods",
      title: "Restricted Assay Methods",
      members: ["u-author", "u-stat"],
      restricted: true,
      locked: true,
      privateTitle: true
    },
    {
      id: "discussion",
      title: "Discussion",
      members: ["u-author", "u-stat", "u-contractor"],
      restricted: false,
      locked: false,
      privateTitle: false
    }
  ],
  notebookCells: [
    { id: "cell-qc-4", allowedUsers: ["u-author", "u-stat"] }
  ],
  chatThreads: [
    {
      id: "thread-1",
      sectionId: "methods",
      visibility: "author-visible",
      mentions: ["u-reviewer", "u-contractor", "u-stat"],
      notebookCellId: "cell-qc-4",
      sectionOwnerApproved: false,
      fanoutPreview: "New mention in Restricted Assay Methods"
    },
    {
      id: "thread-2",
      sectionId: "discussion",
      visibility: "project-visible",
      mentions: ["u-contractor"],
      sectionOwnerApproved: true,
      fanoutPreview: "New mention in Discussion"
    }
  ]
};
