const riskyPacket = {
  now: "2026-05-28T09:45:00.000Z",
  user: {
    id: "user-research-admin-17",
    roles: ["project-admin", "data-steward"],
  },
  project: {
    id: "project-restricted-neuro-42",
    dataClass: "restricted-human-subjects",
    requiresManagedDevice: true,
  },
  action: {
    type: "restricted-data-export",
    objectId: "dataset/raw-neuro-export",
    objectSensitivity: "restricted",
  },
  session: {
    id: "sess-remote-8821",
    userId: "user-research-admin-17",
    startedAt: "2026-05-27T17:10:00.000Z",
    lastActiveAt: "2026-05-28T07:50:00.000Z",
    mfaVerifiedAt: "2026-05-27T17:12:00.000Z",
    passkeyVerifiedAt: null,
    hardwareKeyEnrolled: false,
    geo: {
      label: "Frankfurt, DE",
      distanceFromPreviousKm: 7300,
    },
    device: {
      id: "device-new-browser-9",
      trusted: false,
      managed: false,
      firstSeenAt: "2026-05-28T07:30:00.000Z",
    },
  },
  previousSessions: [
    {
      id: "sess-campus-771",
      userId: "user-research-admin-17",
      endedAt: "2026-05-27T15:55:00.000Z",
      geo: {
        label: "Austin, US",
      },
    },
  ],
};

const safePacket = {
  now: "2026-05-28T09:45:00.000Z",
  user: {
    id: "user-project-editor-12",
    roles: ["project-editor"],
  },
  project: {
    id: "project-open-methods-8",
    dataClass: "public-methods",
    requiresManagedDevice: false,
  },
  action: {
    type: "edit-methods-section",
    objectId: "document/methods",
    objectSensitivity: "normal",
  },
  session: {
    id: "sess-known-100",
    userId: "user-project-editor-12",
    startedAt: "2026-05-28T08:15:00.000Z",
    lastActiveAt: "2026-05-28T09:42:00.000Z",
    mfaVerifiedAt: "2026-05-28T08:16:00.000Z",
    passkeyVerifiedAt: "2026-05-28T08:16:30.000Z",
    hardwareKeyEnrolled: true,
    geo: {
      label: "Austin, US",
      distanceFromPreviousKm: 0,
    },
    device: {
      id: "device-managed-laptop-2",
      trusted: true,
      managed: true,
      firstSeenAt: "2025-11-01T10:00:00.000Z",
    },
  },
  previousSessions: [],
};

module.exports = {
  riskyPacket,
  safePacket,
};
