const now = "2026-05-29T12:10:00.000Z";

const sections = [
  {
    id: "fig-3-final",
    title: "Final Figure 3",
    kind: "figure",
    lockedBy: "maya",
    lockMode: "final-review",
    lockedAt: "2026-05-29T11:42:00.000Z",
    lastHeartbeatAt: "2026-05-29T12:09:15.000Z",
    freezeUntil: "2026-05-29T16:00:00.000Z",
    pendingSuggestions: 2,
    activeEditors: ["maya", "ravi"],
    requestedBy: "ravi",
    requestedAction: "edit-caption",
    requesterRole: "coauthor"
  },
  {
    id: "dataset-table-raw",
    title: "Locked Raw Dataset Table",
    kind: "dataset",
    lockedBy: "nora",
    lockMode: "data-freeze",
    lockedAt: "2026-05-29T08:20:00.000Z",
    lastHeartbeatAt: "2026-05-29T09:05:00.000Z",
    freezeUntil: "2026-05-29T10:00:00.000Z",
    pendingSuggestions: 0,
    activeEditors: [],
    requestedBy: "li",
    requestedAction: "unlock-stale-section",
    requesterRole: "section-owner"
  },
  {
    id: "protocol-sampling",
    title: "Sampling Protocol",
    kind: "protocol",
    lockedBy: "mina",
    lockMode: "reviewer-locked",
    lockedAt: "2026-05-29T11:58:00.000Z",
    lastHeartbeatAt: "2026-05-29T12:09:55.000Z",
    freezeUntil: null,
    pendingSuggestions: 0,
    activeEditors: ["mina"],
    requestedBy: "owen",
    requestedAction: "reviewer-override",
    requesterRole: "reviewer"
  },
  {
    id: "notebook-cell-12",
    title: "Notebook Cell 12",
    kind: "notebook-cell",
    lockedBy: null,
    lockMode: "open",
    lockedAt: null,
    lastHeartbeatAt: null,
    freezeUntil: null,
    pendingSuggestions: 0,
    activeEditors: ["chen"],
    requestedBy: "chen",
    requestedAction: "edit-code-cell",
    requesterRole: "author"
  }
];

module.exports = { now, sections };
