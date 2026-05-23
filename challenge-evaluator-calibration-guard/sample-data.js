const policy = {
  minSeedsPerCriterion: 2,
  maxEvaluatorMeanDrift: 0.75,
  maxCriterionMeanDrift: 0.85,
  maxInterRaterSpread: 1.5,
}

const sharedCriteria = [
  { criterionId: "scientific-validity", label: "Scientific validity", weight: 0.45 },
  { criterionId: "reproducibility", label: "Reproducibility", weight: 0.35 },
  { criterionId: "impact", label: "Applied impact", weight: 0.2 },
]

const readySeeds = [
  {
    seedId: "seed-strong-model",
    outcome: "passing",
    solverTeamId: "synthetic-team-alpha",
    expectedScores: {
      "scientific-validity": 4,
      reproducibility: 4,
      impact: 4,
    },
  },
  {
    seedId: "seed-borderline-report",
    outcome: "borderline",
    solverTeamId: "synthetic-team-beta",
    expectedScores: {
      "scientific-validity": 3,
      reproducibility: 2,
      impact: 3,
    },
  },
  {
    seedId: "seed-weak-notebook",
    outcome: "failing",
    solverTeamId: "synthetic-team-gamma",
    expectedScores: {
      "scientific-validity": 1,
      reproducibility: 1,
      impact: 2,
    },
  },
]

const readyEvaluators = [
  { evaluatorId: "eval-chen", role: "external_reviewer", active: true, conflicts: [] },
  { evaluatorId: "eval-patel", role: "external_reviewer", active: true, conflicts: [] },
  { evaluatorId: "eval-okafor", role: "methodologist", active: true, conflicts: [] },
]

const readyScores = [
  score("ready-score-1", "eval-chen", "seed-strong-model", 4, 4, 4),
  score("ready-score-2", "eval-patel", "seed-strong-model", 4, 3.75, 4),
  score("ready-score-3", "eval-okafor", "seed-strong-model", 3.75, 4, 4),
  score("ready-score-4", "eval-chen", "seed-borderline-report", 3, 2, 3),
  score("ready-score-5", "eval-patel", "seed-borderline-report", 2.75, 2.25, 3),
  score("ready-score-6", "eval-okafor", "seed-borderline-report", 3, 2, 2.75),
  score("ready-score-7", "eval-chen", "seed-weak-notebook", 1, 1, 2),
  score("ready-score-8", "eval-patel", "seed-weak-notebook", 1.25, 1, 2),
  score("ready-score-9", "eval-okafor", "seed-weak-notebook", 1, 1.25, 2.25),
]

const challenges = [
  {
    challengeId: "neuro-imaging-prize",
    title: "Neuro Imaging Model Prize",
    rubricCriteria: sharedCriteria,
    seedSubmissions: readySeeds,
    evaluators: readyEvaluators,
    calibrationScores: readyScores,
    normalizationAnchors: anchorsFor(sharedCriteria),
  },
  {
    challengeId: "materials-catalyst-prize",
    title: "Materials Catalyst Challenge",
    rubricCriteria: sharedCriteria,
    seedSubmissions: [
      {
        seedId: "seed-catalyst-a",
        outcome: "passing",
        solverTeamId: "synthetic-team-catalyst",
        expectedScores: {
          "scientific-validity": 4,
          reproducibility: 4,
          impact: 3,
        },
      },
      {
        seedId: "seed-catalyst-b",
        outcome: "failing",
        solverTeamId: "sponsor-lab",
        expectedScores: {
          "scientific-validity": 1,
          impact: 1,
        },
      },
    ],
    evaluators: [
      { evaluatorId: "eval-sponsor", role: "sponsor", active: true, teamId: "sponsor-lab", conflicts: ["seed-catalyst-b"] },
      { evaluatorId: "eval-harsh", role: "external_reviewer", active: true, conflicts: [] },
    ],
    calibrationScores: [
      score("catalyst-score-1", "eval-sponsor", "seed-catalyst-a", 5, 5, 4),
      score("catalyst-score-2", "eval-harsh", "seed-catalyst-a", 2, 2, 2),
      score("catalyst-score-3", "eval-sponsor", "seed-catalyst-b", 4, 4, 4),
      score("catalyst-score-4", "eval-harsh", "seed-catalyst-b", 3, 0, 3),
    ],
    normalizationAnchors: [
      { criterionId: "scientific-validity", low: 1, target: 3, high: 5 },
    ],
  },
  {
    challengeId: "climate-forecast-prize",
    title: "Climate Forecast Benchmark",
    rubricCriteria: sharedCriteria,
    seedSubmissions: readySeeds,
    evaluators: readyEvaluators,
    calibrationScores: [
      score("climate-score-1", "eval-chen", "seed-strong-model", 5, 5, 5),
      score("climate-score-2", "eval-patel", "seed-strong-model", 3, 3, 3),
      score("climate-score-3", "eval-okafor", "seed-strong-model", 4, 4, 4),
      score("climate-score-4", "eval-chen", "seed-borderline-report", 4, 3, 4),
      score("climate-score-5", "eval-patel", "seed-borderline-report", 2, 1, 2),
      score("climate-score-6", "eval-okafor", "seed-borderline-report", 3, 2, 3),
      score("climate-score-7", "eval-chen", "seed-weak-notebook", 2, 2, 3),
      score("climate-score-8", "eval-patel", "seed-weak-notebook", 0, 0, 1),
      score("climate-score-9", "eval-okafor", "seed-weak-notebook", 1, 1, 2),
    ],
    normalizationAnchors: anchorsFor(sharedCriteria),
  },
]

function score(scoreId, evaluatorId, seedId, scientificValidity, reproducibility, impact) {
  return {
    scoreId,
    evaluatorId,
    seedId,
    scores: {
      "scientific-validity": scientificValidity,
      reproducibility,
      impact,
    },
  }
}

function anchorsFor(criteria) {
  return criteria.map((criterion) => ({
    criterionId: criterion.criterionId,
    low: 1,
    target: 3,
    high: 5,
  }))
}

module.exports = {
  policy,
  challenges,
}
