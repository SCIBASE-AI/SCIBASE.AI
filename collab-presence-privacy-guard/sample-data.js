const riskyPresenceRoom = {
  policy: {
    staleAfterSeconds: 120,
  },
  room: {
    id: 'room-editor-12',
    title: 'Manuscript v2 collaborative editing room',
    users: [
      {
        id: 'u-owner',
        name: 'Ada Moreno',
        institution: 'SCIBASE Lab',
        roles: ['owner'],
      },
      {
        id: 'u-collab',
        name: 'Lee Hart',
        institution: 'SCIBASE Lab',
        roles: ['contributor'],
      },
      {
        id: 'u-reviewer',
        name: 'Dr. Hidden Reviewer',
        alias: 'Anonymous reviewer A',
        institution: 'External Review Board',
        roles: ['anonymous_reviewer'],
        anonymous: true,
      },
      {
        id: 'u-viewer',
        name: 'Public Viewer',
        institution: 'Public',
        roles: ['viewer'],
      },
    ],
    sections: [
      {
        id: 'sec-intro',
        title: 'Introduction',
        kind: 'manuscript',
        visibility: 'public',
        locked: false,
        allowedUsers: [],
      },
      {
        id: 'sec-private-data',
        title: 'Embargoed patient dataset table',
        kind: 'dataset',
        visibility: 'embargoed',
        locked: true,
        allowedUsers: ['u-owner'],
      },
      {
        id: 'sec-review',
        title: 'Anonymous reviewer notes',
        kind: 'review',
        visibility: 'restricted',
        locked: false,
        allowedUsers: ['u-owner', 'u-reviewer'],
      },
      {
        id: 'sec-notebook',
        title: 'Notebook cell outputs',
        kind: 'notebook',
        visibility: 'private',
        locked: true,
        allowedUsers: ['u-owner', 'u-collab'],
      },
    ],
    presences: [
      {
        userId: 'u-owner',
        displayName: 'Ada Moreno',
        sectionId: 'sec-private-data',
        cursorAnchor: 'row:patient-17',
        ageSeconds: 10,
      },
      {
        userId: 'u-reviewer',
        displayName: 'Dr. Hidden Reviewer',
        sectionId: 'sec-review',
        cursorAnchor: 'comment:blind-note-4',
        ageSeconds: 35,
      },
      {
        userId: 'u-collab',
        displayName: 'Lee Hart',
        sectionId: 'sec-notebook',
        cursorAnchor: 'cell:analysis-22-output',
        ageSeconds: 190,
      },
    ],
    viewers: [
      {
        id: 'u-viewer',
        name: 'Public Viewer',
        institution: 'Public',
        roles: ['viewer'],
      },
      {
        id: 'u-collab',
        name: 'Lee Hart',
        institution: 'SCIBASE Lab',
        roles: ['contributor'],
      },
    ],
  },
};

function buildSafePresenceRoom() {
  const clone = JSON.parse(JSON.stringify(riskyPresenceRoom));
  const sections = clone.room.sections;
  sections.find((section) => section.id === 'sec-private-data').allowedUsers.push('u-viewer', 'u-collab');
  sections.find((section) => section.id === 'sec-private-data').visibility = 'private';
  sections.find((section) => section.id === 'sec-private-data').locked = false;
  sections.find((section) => section.id === 'sec-review').allowedUsers.push('u-viewer', 'u-collab');
  sections.find((section) => section.id === 'sec-review').visibility = 'private';
  sections.find((section) => section.id === 'sec-notebook').allowedUsers.push('u-viewer');
  sections.find((section) => section.id === 'sec-notebook').locked = false;
  const reviewerPresence = clone.room.presences.find((presence) => presence.userId === 'u-reviewer');
  reviewerPresence.displayName = 'Anonymous reviewer A';
  clone.room.presences.find((presence) => presence.userId === 'u-collab').ageSeconds = 25;
  return clone;
}

module.exports = {
  buildSafePresenceRoom,
  riskyPresenceRoom,
};
