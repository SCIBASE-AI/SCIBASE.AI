"use strict";

const biomarkerChallenge = {
  id: "single-cell-biomarker-prize-2026",
  title: "Single-Cell Biomarker Discovery Prize",
  sponsor: "Northstar Therapeutics",
  visibility: "private",
  ndaRequired: true,
  ndaTemplateId: "",
  prizeCents: 25000000,
  reserveCents: 2500000,
  escrowedCents: 17500000,
  honorableMentionReserveCents: 0,
  ipTransferTrigger: "on-submission",
  milestones: [
    {
      id: "proposal",
      amountCents: 4000000,
      dueDate: "2026-07-01",
      acceptanceCriteria: "Hypothesis and assay plan accepted by sponsor.",
    },
    {
      id: "prototype",
      amountCents: 9000000,
      dueDate: "",
      acceptanceCriteria: "Reproducible notebook and candidate marker list.",
    },
    {
      id: "final",
      amountCents: 15000000,
      dueDate: "2026-09-15",
      acceptanceCriteria: "",
    },
  ],
  honorableMentions: [{ count: 2, amountCents: 1000000 }],
  teamSplits: [
    {
      payeeId: "solver-alice",
      payeeType: "individual",
      percent: 55,
      payoutStatus: "ready",
      taxFormOnFile: true,
    },
    {
      payeeId: "solver-bob",
      payeeType: "individual",
      percent: 35,
      payoutStatus: "kyc_pending",
      taxFormOnFile: false,
    },
    {
      payeeId: "university-lab",
      payeeType: "institution",
      percent: 15,
      payoutStatus: "ready",
      taxFormOnFile: false,
    },
  ],
  arbitration: {
    independentReviewers: 1,
    sponsorCanOverride: true,
    appealWindowDays: 2,
  },
};

module.exports = {
  biomarkerChallenge,
};
