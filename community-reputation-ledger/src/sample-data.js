export const sampleUsers = [
  {
    id: "user-alina",
    name: "Alina Chen",
    domain: "computational-biology",
    institution: "Northbridge University",
    metrics: {
      citations: 1410,
      forks: 18,
      endorsements: 32,
      reviewQuality: 91,
      reviewsCompleted: 14,
      reproducibilityScore: 94,
      bountyCompletions: 3
    }
  },
  {
    id: "user-mateo",
    name: "Mateo Ruiz",
    domain: "computational-biology",
    institution: "Open Organoid Consortium",
    metrics: {
      citations: 690,
      forks: 34,
      endorsements: 20,
      reviewQuality: 84,
      reviewsCompleted: 9,
      reproducibilityScore: 88,
      bountyCompletions: 1
    }
  },
  {
    id: "user-nadia",
    name: "Nadia Okafor",
    domain: "social-science",
    institution: "Civic Methods Lab",
    metrics: {
      citations: 480,
      forks: 11,
      endorsements: 18,
      reviewQuality: 89,
      reviewsCompleted: 17,
      reproducibilityScore: 80,
      bountyCompletions: 0
    }
  }
];

export const sampleProject = {
  id: "project-organoid-response",
  title: "Organoid perturbation response atlas",
  domain: "computational-biology"
};

export const sampleReviews = [
  {
    id: "review-1",
    projectId: "project-organoid-response",
    reviewerId: "user-nadia",
    mode: "semi-private",
    discipline: "biology",
    scores: { clarity: 8, rigor: 9, novelty: 7, reproducibility: 9 },
    summary: "Strong reproducibility package with a few missing limitations.",
    createdAt: "2026-05-05T10:00:00Z"
  },
  {
    id: "review-2",
    projectId: "project-organoid-response",
    reviewerId: "user-mateo",
    mode: "double-blind",
    discipline: "biology",
    scores: { clarity: 7, rigor: 8, novelty: 8, reproducibility: 8 },
    summary: "Novel angle, needs clearer cohort-bias discussion.",
    createdAt: "2026-05-07T12:00:00Z"
  }
];

export const sampleComments = [
  {
    id: "comment-1",
    projectId: "project-organoid-response",
    authorId: "user-nadia",
    target: { type: "notebook", id: "analysis-qc", range: "cell:4" },
    text: "Please expose the random seed and package lockfile.",
    visibility: "authors-and-reviewers",
    createdAt: "2026-05-05T10:15:00Z"
  }
];

export const sampleContributions = [
  { id: "contrib-1", projectId: "project-organoid-response", userId: "user-alina", role: "Conceptualization", weight: 25, at: "2026-04-01T10:00:00Z" },
  { id: "contrib-2", projectId: "project-organoid-response", userId: "user-alina", role: "Software", weight: 30, at: "2026-04-04T10:00:00Z" },
  { id: "contrib-3", projectId: "project-organoid-response", userId: "user-mateo", role: "Data Curation", weight: 25, at: "2026-04-07T10:00:00Z" },
  { id: "contrib-4", projectId: "project-organoid-response", userId: "user-nadia", role: "Peer Review", weight: 20, at: "2026-05-05T10:00:00Z" }
];
