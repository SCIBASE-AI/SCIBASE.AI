"use strict";

const baseChallenge = {
  id: "SCI-BOUNTY-018-SYNTH",
  title: "Synthetic Enzyme Stability Scientific Bounty",
  appealDeadline: "2026-06-15T17:00:00Z",
  allowedReleaseTargets: ["winner", "finalist", "non_winner", "solver_team"],
  privateBenchmarkLabels: ["Sponsor-Holdout-Beta", "InternalRetrosynthesisSet-14"],
  confidentialTerms: ["Q3 partner assay notebook"]
};

const rubricItems = [
  {
    id: "R1",
    name: "Reproducibility",
    description: "Submission can be rebuilt and rerun from the documented materials."
  },
  {
    id: "R2",
    name: "Scientific validity",
    description: "Claims are supported by appropriate controls, references, and statistics."
  },
  {
    id: "R3",
    name: "Operational safety",
    description: "The method respects allowed materials, safety constraints, and deployment limits."
  },
  {
    id: "R4",
    name: "Communication",
    description: "The result is explained clearly enough for sponsor review and solver appeal."
  }
];

const teams = [
  {
    id: "team-alpha",
    name: "Team Alpha",
    protectedTerms: ["AlphaFold wet-lab bridge", "alpha solvent scaffold"]
  },
  {
    id: "team-beta",
    name: "Team Beta",
    protectedTerms: ["DeltaDock solvent ensemble", "beta catalyst map"]
  },
  {
    id: "team-gamma",
    name: "Team Gamma",
    protectedTerms: ["gamma constraint lattice", "microfluidic remix trace"]
  }
];

const reviewers = [
  {
    name: "Dr. Mira Lin",
    email: "mira.lin@example.invalid",
    handle: "@mira-reviewer",
    aliases: ["reviewer-lin"]
  },
  {
    name: "Prof. Jonah Vale",
    email: "jonah.vale@example.invalid",
    handle: "@vale-panel",
    aliases: ["reviewer-vale"]
  }
];

const cleanFeedback = [
  {
    rubricId: "R1",
    comment:
      "The package rebuilds from the stated manifest and should keep the checksum table with each rerun so future reviewers can validate the same artifact set."
  },
  {
    rubricId: "R2",
    comment:
      "The statistical argument is well supported, and the next submission should include the same confidence interval explanation beside the control comparison."
  },
  {
    rubricId: "R3",
    comment:
      "The method stays inside the allowed materials list and should maintain the safety notes that separate permitted bench assumptions from deployment claims."
  },
  {
    rubricId: "R4",
    comment:
      "The narrative is concise and should preserve the public evidence map because it helps sponsors compare the claim without exposing private review data."
  }
];

function makeCleanDebrief(teamId, releaseTarget) {
  return {
    teamId,
    releaseTarget,
    appealDeadline: baseChallenge.appealDeadline,
    summary:
      "This solver-facing debrief summarizes the accepted rubric outcome using public challenge criteria only.",
    feedback: cleanFeedback.map((entry) => ({ ...entry }))
  };
}

const cleanPacket = {
  packetId: "debrief-clean-release-v1",
  challenge: baseChallenge,
  rubricItems,
  teams,
  reviewers,
  debriefs: [
    makeCleanDebrief("team-alpha", "winner"),
    makeCleanDebrief("team-beta", "finalist"),
    makeCleanDebrief("team-gamma", "non_winner")
  ]
};

const revisionPacket = {
  packetId: "debrief-revision-needed-v1",
  challenge: baseChallenge,
  rubricItems,
  teams,
  reviewers,
  debriefs: [
    makeCleanDebrief("team-alpha", "winner"),
    {
      ...makeCleanDebrief("team-beta", "finalist"),
      appealDeadline: "2026-06-12T17:00:00Z",
      feedback: [
        {
          rubricId: "R1",
          comment: "Good work."
        },
        {
          rubricId: "R2",
          comment:
            "The comparison is promising and should include the same public control table that the rubric asks every finalist team to provide."
        }
      ]
    },
    makeCleanDebrief("team-gamma", "non_winner")
  ]
};

const holdPacket = {
  packetId: "debrief-hold-release-v1",
  challenge: baseChallenge,
  rubricItems,
  teams,
  reviewers,
  debriefs: [
    makeCleanDebrief("team-alpha", "winner"),
    {
      ...makeCleanDebrief("team-beta", "finalist"),
      reviewerNotes:
        "Reviewer Dr. Mira Lin noted that Sponsor-Holdout-Beta and InternalRetrosynthesisSet-14 drove the ranking.",
      solverMessage:
        "The team can negotiate payment off-platform by PayPal if they want a faster bounty split.",
      feedback: [
        {
          rubricId: "R1",
          comment:
            "The rebuild needs more detail and should avoid copying the AlphaFold wet-lab bridge from another team when documenting future evidence."
        },
        ...cleanFeedback.slice(1).map((entry) => ({ ...entry }))
      ]
    },
    makeCleanDebrief("team-gamma", "non_winner")
  ]
};

module.exports = {
  baseChallenge,
  rubricItems,
  teams,
  reviewers,
  cleanPacket,
  revisionPacket,
  holdPacket
};
