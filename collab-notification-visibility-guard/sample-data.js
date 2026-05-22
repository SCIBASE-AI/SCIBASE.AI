"use strict";

const sampleBatch = {
  projectId: "sci-editor-proj-12-demo",
  evaluatedAt: "2026-05-22T14:00:00Z",
  recipients: [
    {
      id: "ed-1",
      role: "editor",
      defaultChannel: "in_app",
      scopes: ["manuscript:core", "review:R2", "section:methods", "notebook:nb-qc", "embargo:methods"],
      permissions: ["viewReviewerIdentity", "viewRestrictedNotebookPaths", "viewEmbargoedAnchors", "viewPrivateThreads"],
      digestReceiptId: "receipt-ed-1"
    },
    {
      id: "pm-1",
      role: "editor",
      defaultChannel: "email",
      scopes: ["manuscript:core", "section:methods", "embargo:methods"],
      permissions: ["viewEmbargoedAnchors", "viewPrivateThreads"],
      digestReceiptId: "receipt-pm-1"
    },
    {
      id: "rev-anon-2",
      role: "reviewer",
      defaultChannel: "in_app",
      scopes: ["manuscript:core", "review:R2", "section:methods"],
      permissions: [],
      digestReceiptId: null
    },
    {
      id: "author-1",
      role: "author",
      defaultChannel: "email",
      scopes: ["manuscript:core", "section:introduction"],
      permissions: [],
      digestReceiptId: null
    },
    {
      id: "analyst-1",
      role: "collaborator",
      defaultChannel: "push",
      scopes: ["manuscript:core", "notebook:nb-public"],
      permissions: [],
      digestReceiptId: "receipt-analyst-1"
    },
    {
      id: "sponsor-1",
      role: "sponsor",
      defaultChannel: "webhook",
      scopes: ["project:public"],
      permissions: [],
      digestReceiptId: null
    }
  ],
  events: [
    {
      id: "evt-reviewer-note",
      type: "reviewer_note",
      subject: "Reviewer Dr. Lane flagged Methods - oncology cohort",
      message: "Reviewer Dr. Lane says Figure 2 references /restricted/nb-qc.ipynb and should not be visible in the author email digest yet.",
      allowedRoles: ["editor", "reviewer", "author"],
      allowedChannels: ["in_app", "email"],
      recipientIds: ["ed-1", "rev-anon-2", "author-1"],
      requiredScopes: ["review:R2"],
      privateThread: true,
      threadParticipants: ["ed-1", "rev-anon-2"],
      threadTitle: "Private R2 reviewer note",
      blindedReviewerIdentity: true,
      reviewerIdentity: "Dr. Lane",
      privateSectionTitle: true,
      sectionId: "methods",
      sectionTitle: "Methods - oncology cohort",
      restrictedNotebookPath: true,
      notebookId: "nb-qc",
      notebookPath: "/restricted/nb-qc.ipynb",
      externalDigestSafe: false
    },
    {
      id: "evt-methods-lock",
      type: "section_lock",
      subject: "Methods - oncology cohort locked for review",
      message: "The Methods - oncology cohort section is locked at anchor sec-methods-r2 until the embargo review clears.",
      allowedRoles: ["editor", "author"],
      allowedChannels: ["in_app", "email"],
      recipientIds: ["ed-1", "author-1"],
      requiredScopes: ["manuscript:core"],
      privateSectionTitle: true,
      sectionId: "methods",
      sectionTitle: "Methods - oncology cohort",
      embargoedAnchor: true,
      anchor: "sec-methods-r2",
      externalDigestSafe: false
    },
    {
      id: "evt-notebook-output",
      type: "notebook_output",
      subject: "QC notebook output changed",
      message: "Output for /restricted/nb-qc.ipynb changed after collaborator review. Verify cell qc-17 before export.",
      allowedRoles: ["editor", "author", "collaborator"],
      allowedChannels: ["in_app", "email", "push"],
      recipientIds: ["ed-1", "analyst-1", "author-1"],
      requiredScopes: ["manuscript:core"],
      restrictedNotebookPath: true,
      notebookId: "nb-qc",
      notebookPath: "/restricted/nb-qc.ipynb",
      externalDigestSafe: false
    },
    {
      id: "evt-export-digest",
      type: "export_digest",
      subject: "Publication export ready",
      message: "Export packet includes private collaborator note Final R2 reply before journal upload.",
      allowedRoles: ["editor", "author", "sponsor"],
      allowedChannels: ["email", "webhook", "in_app"],
      recipientIds: ["pm-1", "author-1", "sponsor-1"],
      requiredScopes: ["manuscript:core"],
      privateCollaboratorNote: true,
      threadTitle: "Final R2 reply",
      requiresReceipt: true,
      externalDigestSafe: false
    }
  ]
};

module.exports = {
  sampleBatch
};
