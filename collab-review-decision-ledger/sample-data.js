const manuscript = {
  documentId: "doc-quantum-12",
  title: "Quantum catalyst manuscript",
  requiredApprovers: ["lead-author", "stat-reviewer", "data-owner"],
  sections: [
    {
      id: "intro",
      title: "Introduction",
      lock: { mode: "freeze-window", lockedAt: "2026-05-20T10:00:00.000Z" },
      comments: [],
      suggestions: [{ id: "sg-1", status: "accepted" }],
      notebookOutputs: [],
      approvals: [
        { role: "lead-author", status: "approved" },
        { role: "stat-reviewer", status: "approved" },
        { role: "data-owner", status: "approved" },
      ],
      decisionRecords: [{ id: "dec-1", status: "recorded", text: "Intro accepted." }],
      snapshot: { id: "snap-intro", restoreReady: true },
    },
    {
      id: "results",
      title: "Results",
      lock: { mode: "editable", lockedAt: "2026-05-17T08:00:00.000Z" },
      comments: [{ id: "c-7", severity: "blocking", resolved: false }],
      suggestions: [{ id: "sg-7", status: "open" }],
      notebookOutputs: [
        {
          id: "nb-7",
          status: "stale",
          lastExecutedAt: "2026-05-16T05:00:00.000Z",
          sourceHash: "sha256:old",
          currentSourceHash: "sha256:new",
        },
      ],
      approvals: [
        { role: "lead-author", status: "approved" },
        { role: "stat-reviewer", status: "pending" },
        { role: "data-owner", status: "approved" },
      ],
      decisionRecords: [{ id: "dec-7", status: "missing", text: "" }],
      snapshot: { id: "snap-results", restoreReady: false },
    },
    {
      id: "methods",
      title: "Methods",
      lock: { mode: "freeze-window", lockedAt: "2026-05-20T11:00:00.000Z" },
      comments: [],
      suggestions: [{ id: "sg-3", status: "rejected" }],
      notebookOutputs: [
        {
          id: "nb-3",
          status: "fresh",
          lastExecutedAt: "2026-05-20T09:00:00.000Z",
          sourceHash: "sha256:methods",
          currentSourceHash: "sha256:methods",
        },
      ],
      approvals: [
        { role: "lead-author", status: "approved" },
        { role: "stat-reviewer", status: "approved" },
        { role: "data-owner", status: "approved" },
      ],
      decisionRecords: [{ id: "dec-3", status: "recorded", text: "Methods frozen." }],
      snapshot: { id: "snap-methods", restoreReady: true },
    },
  ],
};

module.exports = { manuscript };
