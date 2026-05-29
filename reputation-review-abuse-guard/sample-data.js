const reputationBatch = {
  id: "reputation-batch-2026-05-29",
  generatedAt: "2026-05-29T13:02:00.000Z",
  reviews: [
    {
      id: "review-101",
      reviewer: "ana",
      targetProject: "proj-climate-7",
      targetAuthor: "bao",
      reviewerAffiliation: "North Lab",
      authorAffiliation: "South Lab",
      scoreDelta: 8,
      commentWords: 142,
      reciprocalReviewIds: [],
      anonymousMode: false,
      endorsementCluster: ["li", "mina"]
    },
    {
      id: "review-102",
      reviewer: "chen",
      targetProject: "proj-neuro-4",
      targetAuthor: "dina",
      reviewerAffiliation: "Vector Institute",
      authorAffiliation: "Vector Institute",
      scoreDelta: 15,
      commentWords: 18,
      reciprocalReviewIds: ["review-099"],
      anonymousMode: false,
      endorsementCluster: ["dina", "eli", "chen"]
    },
    {
      id: "review-103",
      reviewer: "eli",
      targetProject: "proj-math-2",
      targetAuthor: "faye",
      reviewerAffiliation: "Open Methods Group",
      authorAffiliation: "Cedar University",
      scoreDelta: 11,
      commentWords: 9,
      reciprocalReviewIds: [],
      anonymousMode: true,
      leakedIdentityText: "As your labmate Eli mentioned yesterday",
      endorsementCluster: ["faye", "gita", "eli"]
    },
    {
      id: "review-104",
      reviewer: "hugo",
      targetProject: "proj-protein-8",
      targetAuthor: "iris",
      reviewerAffiliation: "North Lab",
      authorAffiliation: "West Lab",
      scoreDelta: 5,
      commentWords: 64,
      reciprocalReviewIds: [],
      anonymousMode: false,
      endorsementCluster: ["jules"]
    }
  ]
};

module.exports = { reputationBatch };
