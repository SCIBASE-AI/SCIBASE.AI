"use strict";

const manuscriptSession = {
  documentId: "ms-cardiometabolic-draft",
  title: "Cardiometabolic Manuscript Draft",
  auditTime: "2026-05-28T18:00:00Z",
  activeUsers: ["author-lee", "stat-reviewer", "editor-maya", "guest-ravi"],
  documentDirty: true,
  autosavePolicy: {
    maxLagMinutes: 2,
  },
  sections: [
    {
      id: "methods-final-figures",
      label: "Final Figure Methods",
      range: { start: 2200, end: 3150 },
    },
    {
      id: "primary-results",
      label: "Primary Results",
      range: { start: 4150, end: 5480 },
    },
    {
      id: "supplemental-code",
      label: "Supplemental Notebook",
      range: { start: 7020, end: 8150 },
    },
  ],
  locks: [
    {
      sectionId: "methods-final-figures",
      mode: "hard",
      ownerUserId: "editor-maya",
      sectionOwnerUserIds: ["author-lee"],
      maintainerUserIds: ["science-admin"],
      acquiredAt: "2026-05-28T17:02:00Z",
      expiresAt: "2026-05-28T17:40:00Z",
      reason: "Final figure captions are frozen for journal submission.",
    },
    {
      sectionId: "primary-results",
      mode: "hard",
      ownerUserId: "stat-reviewer",
      sectionOwnerUserIds: ["author-lee"],
      maintainerUserIds: ["science-admin"],
      acquiredAt: "2026-05-28T17:45:00Z",
      expiresAt: "2026-05-28T18:30:00Z",
      reason: "Statistician is validating table values.",
    },
  ],
  events: [
    {
      id: "evt-001",
      type: "edit",
      sectionId: "methods-final-figures",
      userId: "guest-ravi",
      at: "2026-05-28T17:48:00Z",
      offline: false,
      patch: "Changed figure 2 caption from adjudicated to automated.",
    },
    {
      id: "evt-002",
      type: "unlock",
      sectionId: "primary-results",
      userId: "guest-ravi",
      at: "2026-05-28T17:52:00Z",
    },
    {
      id: "evt-003",
      type: "edit",
      sectionId: "primary-results",
      userId: "author-lee",
      at: "2026-05-28T17:55:00Z",
      offline: true,
      patch: "Pasted local table 1 values from offline draft.",
    },
    {
      id: "evt-004",
      type: "presence",
      sectionId: "primary-results",
      userId: "guest-ravi",
      at: "2026-05-28T17:57:00Z",
      cursorRange: { start: 4200, end: 4212 },
    },
    {
      id: "evt-005",
      type: "named-version",
      sectionId: "supplemental-code",
      userId: "author-lee",
      at: "2026-05-28T17:59:00Z",
      versionId: "v-submit-candidate",
    },
  ],
  autosaves: [
    {
      sectionId: "methods-final-figures",
      eventId: "evt-001",
      lastLocalEditAt: "2026-05-28T17:48:00Z",
      savedAt: "2026-05-28T18:02:00Z",
    },
    {
      sectionId: "primary-results",
      eventId: "evt-003",
      lastLocalEditAt: "2026-05-28T17:55:00Z",
      savedAt: "2026-05-28T17:59:00Z",
    },
  ],
  versions: [
    {
      id: "v-base",
      parentId: null,
      createdAt: "2026-05-28T16:00:00Z",
      authorUserId: "author-lee",
    },
    {
      id: "v-analysis-pass",
      parentId: "v-missing-parent",
      createdAt: "2026-05-28T17:20:00Z",
      authorUserId: "stat-reviewer",
    },
    {
      id: "v-submit-candidate",
      parentId: "v-analysis-pass",
      createdAt: "2026-05-28T17:59:00Z",
      authorUserId: "author-lee",
    },
  ],
  restoreRequests: [
    {
      id: "restore-001",
      targetVersionId: "v-base",
      requestedBy: "editor-maya",
      sectionId: "primary-results",
      unsavedEditIds: ["evt-003", "evt-005"],
    },
  ],
};

module.exports = {
  manuscriptSession,
};
