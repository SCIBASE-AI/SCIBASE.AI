const community = {
  id: "community-neuro-tools",
  domain: "computational-neuroscience",
  reviewPeriod: "2026-Q2",
  ladders: [
    {
      id: "open-science-mentor",
      name: "Open Science Mentor",
      thresholds: {
        emerging: 45,
        trusted: 70,
        champion: 88
      }
    }
  ]
};

const members = [
  {
    id: "mentor-a",
    displayName: "Dr. Mira Chen",
    role: "mentor",
    institution: "Northlake Lab",
    reputation: 82,
    conflicts: ["trainee-c"],
    priorBadge: "Trusted Reviewer"
  },
  {
    id: "mentor-b",
    displayName: "Dr. Omar Patel",
    role: "mentor",
    institution: "Cedar Institute",
    reputation: 61,
    conflicts: [],
    priorBadge: null
  },
  {
    id: "trainee-a",
    displayName: "Lina Gomez",
    role: "trainee",
    institution: "Northlake Lab",
    reputation: 34,
    conflicts: [],
    priorBadge: null
  },
  {
    id: "trainee-b",
    displayName: "Kai Smith",
    role: "trainee",
    institution: "Cedar Institute",
    reputation: 41,
    conflicts: [],
    priorBadge: null
  },
  {
    id: "trainee-c",
    displayName: "Noah Chen",
    role: "trainee",
    institution: "Northlake Lab",
    reputation: 29,
    conflicts: ["mentor-a"],
    priorBadge: null
  }
];

const mentorships = [
  {
    id: "pair-1",
    mentorId: "mentor-a",
    traineeId: "trainee-a",
    startDate: "2026-01-12",
    declaredRelationship: "formal-lab-mentor",
    goal: "Train reproducible notebook review and dataset curation",
    evidenceIds: ["rev-1", "rerun-1", "dataset-1", "comment-1", "credit-1"],
    acknowledgements: ["trainee-a", "mentor-a", "project-owner-7"]
  },
  {
    id: "pair-2",
    mentorId: "mentor-b",
    traineeId: "trainee-b",
    startDate: "2026-02-18",
    declaredRelationship: "community-mentor",
    goal: "Build first peer-review portfolio",
    evidenceIds: ["rev-2", "comment-2", "credit-2"],
    acknowledgements: ["trainee-b", "mentor-b"]
  },
  {
    id: "pair-3",
    mentorId: "mentor-a",
    traineeId: "trainee-c",
    startDate: "2026-03-04",
    declaredRelationship: "family-member",
    goal: "Accelerate challenge reputation tier",
    evidenceIds: ["rev-3", "credit-3"],
    acknowledgements: ["mentor-a"]
  }
];

const evidence = [
  {
    id: "rev-1",
    type: "supervised-peer-review",
    projectId: "proj-brain-atlas",
    qualityScore: 91,
    publicMode: "semi-private",
    creditedRoles: ["review", "methodology"],
    independentEndorsement: true,
    reproducibilityLinked: true
  },
  {
    id: "rerun-1",
    type: "reproducibility-rerun",
    projectId: "proj-brain-atlas",
    qualityScore: 88,
    publicMode: "public",
    creditedRoles: ["software", "validation"],
    independentEndorsement: true,
    reproducibilityLinked: true
  },
  {
    id: "dataset-1",
    type: "dataset-curation",
    projectId: "proj-brain-atlas",
    qualityScore: 84,
    publicMode: "public",
    creditedRoles: ["data-curation"],
    independentEndorsement: true,
    reproducibilityLinked: true
  },
  {
    id: "comment-1",
    type: "inline-review-comment",
    projectId: "proj-brain-atlas",
    qualityScore: 78,
    publicMode: "semi-private",
    creditedRoles: ["review"],
    independentEndorsement: false,
    reproducibilityLinked: false
  },
  {
    id: "credit-1",
    type: "credit-approval",
    projectId: "proj-brain-atlas",
    qualityScore: 95,
    publicMode: "public",
    creditedRoles: ["supervision", "validation", "data-curation"],
    independentEndorsement: true,
    reproducibilityLinked: true
  },
  {
    id: "rev-2",
    type: "supervised-peer-review",
    projectId: "proj-microbiome",
    qualityScore: 68,
    publicMode: "semi-private",
    creditedRoles: ["review"],
    independentEndorsement: false,
    reproducibilityLinked: false
  },
  {
    id: "comment-2",
    type: "inline-review-comment",
    projectId: "proj-microbiome",
    qualityScore: 71,
    publicMode: "public",
    creditedRoles: ["review"],
    independentEndorsement: true,
    reproducibilityLinked: false
  },
  {
    id: "credit-2",
    type: "credit-approval",
    projectId: "proj-microbiome",
    qualityScore: 74,
    publicMode: "public",
    creditedRoles: ["review"],
    independentEndorsement: true,
    reproducibilityLinked: false
  },
  {
    id: "rev-3",
    type: "supervised-peer-review",
    projectId: "proj-private-challenge",
    qualityScore: 82,
    publicMode: "anonymous",
    creditedRoles: ["review"],
    independentEndorsement: false,
    reproducibilityLinked: false
  },
  {
    id: "credit-3",
    type: "credit-approval",
    projectId: "proj-private-challenge",
    qualityScore: 90,
    publicMode: "anonymous",
    creditedRoles: ["supervision"],
    independentEndorsement: false,
    reproducibilityLinked: false
  }
];

module.exports = {
  community,
  members,
  mentorships,
  evidence
};
