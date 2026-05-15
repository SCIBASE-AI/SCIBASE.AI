const TOPIC_RULES = [
  {
    topic: "statistical support",
    patterns: ["confidence", "statistical", "test", "significance", "delta"],
    responseStrategy: "Add quantitative uncertainty support before defending the claim.",
    revisionTemplate: "Add confidence intervals, test method, and benchmark delta interpretation."
  },
  {
    topic: "scope and generalization",
    patterns: ["robust", "overgeneralized", "smaller", "corpus", "domain"],
    responseStrategy: "Narrow the claim or add cross-domain evidence.",
    revisionTemplate: "Clarify domain coverage, sample balance, and limits of generalization."
  },
  {
    topic: "reproducibility",
    patterns: ["reproduc", "scripts", "package", "dependency", "version"],
    responseStrategy: "Convert reproducibility concern into a concrete artifact fix.",
    revisionTemplate: "Pin dependencies, publish run commands, and add environment checks."
  },
  {
    topic: "feature attribution",
    patterns: ["ablation", "features", "drive", "unclear", "gains"],
    responseStrategy: "Explain which mechanism supports the reported improvement.",
    revisionTemplate: "Expand ablation narrative with ranked feature contributions."
  }
];

const SEVERITY_WEIGHT = {
  minor: 1,
  moderate: 2,
  major: 3,
  critical: 4
};

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function classifyConcern(reviewText) {
  const text = normalizeText(reviewText);
  const scored = TOPIC_RULES.map((rule) => ({
    ...rule,
    score: rule.patterns.filter((pattern) => text.includes(pattern)).length
  })).sort((a, b) => b.score - a.score || a.topic.localeCompare(b.topic));

  return scored[0].score > 0 ? scored[0] : {
    topic: "editorial clarity",
    responseStrategy: "Acknowledge the concern and make the affected claim easier to audit.",
    revisionTemplate: "Add a targeted clarification and cite the supporting artifact."
  };
}

function relevantClaims(manuscript, reviewText) {
  const text = normalizeText(reviewText);
  return manuscript.claims.filter((claim) => {
    const claimTokens = normalizeText(claim.text).split(/[^a-z0-9]+/).filter((token) => token.length > 5);
    return claimTokens.some((token) => text.includes(token));
  });
}

function evidenceById(manuscript) {
  return new Map(manuscript.evidence.map((entry) => [entry.id, entry]));
}

function evidenceRequests(manuscript, claims, concern) {
  const evidenceMap = evidenceById(manuscript);
  const requests = [];

  for (const claim of claims) {
    const partialEvidence = claim.evidenceIds
      .map((id) => evidenceMap.get(id))
      .filter((entry) => entry && entry.status !== "available");

    if (partialEvidence.length > 0) {
      requests.push({
        claimId: claim.id,
        priority: "high",
        request: `Complete ${partialEvidence.map((entry) => entry.kind).join(", ")} evidence for claim ${claim.id}.`
      });
    }
  }

  if (concern.topic === "statistical support") {
    requests.push({
      claimId: claims[0]?.id || "manuscript",
      priority: "high",
      request: "Attach uncertainty intervals and statistical test output for the benchmark result."
    });
  }

  if (concern.topic === "scope and generalization") {
    requests.push({
      claimId: claims[0]?.id || "manuscript",
      priority: "medium",
      request: "Add domain-size table and revise wording where evidence is underpowered."
    });
  }

  return requests;
}

function buildResponseRow(manuscript, review, index) {
  const concern = classifyConcern(review.text);
  const claims = relevantClaims(manuscript, review.text);
  const weight = SEVERITY_WEIGHT[review.severity] || 2;
  const requests = evidenceRequests(manuscript, claims, concern);
  const unresolvedRisk = weight >= 3 && requests.some((request) => request.priority === "high");

  return {
    id: `response-${index + 1}`,
    reviewer: review.reviewer,
    severity: review.severity,
    concernTopic: concern.topic,
    reviewerConcern: review.text,
    linkedClaimIds: claims.map((claim) => claim.id),
    responseStrategy: concern.responseStrategy,
    authorResponseDraft: `We thank ${review.reviewer} for this ${concern.topic} concern. We will revise the manuscript by: ${concern.revisionTemplate}`,
    revisionTasks: [
      concern.revisionTemplate,
      ...requests.map((request) => request.request)
    ],
    evidenceRequests: requests,
    unresolvedRisk,
    riskScore: weight + requests.length + (unresolvedRisk ? 2 : 0)
  };
}

function clusterRows(rows) {
  const clusters = new Map();
  for (const row of rows) {
    if (!clusters.has(row.concernTopic)) {
      clusters.set(row.concernTopic, {
        topic: row.concernTopic,
        responseIds: [],
        highestSeverity: row.severity,
        sharedTasks: new Set()
      });
    }
    const cluster = clusters.get(row.concernTopic);
    cluster.responseIds.push(row.id);
    row.revisionTasks.forEach((task) => cluster.sharedTasks.add(task));
    if ((SEVERITY_WEIGHT[row.severity] || 0) > (SEVERITY_WEIGHT[cluster.highestSeverity] || 0)) {
      cluster.highestSeverity = row.severity;
    }
  }

  return [...clusters.values()].map((cluster) => ({
    ...cluster,
    sharedTasks: [...cluster.sharedTasks]
  }));
}

function readiness(rows) {
  const totalRisk = rows.reduce((sum, row) => sum + row.riskScore, 0);
  const unresolvedMajor = rows.filter((row) => row.unresolvedRisk).length;
  const score = Math.max(0, 100 - totalRisk * 5 - unresolvedMajor * 10);

  return {
    score,
    status: score >= 80 ? "ready-with-minor-edits" : score >= 55 ? "major-revision-needed" : "not-ready",
    blockers: rows
      .filter((row) => row.unresolvedRisk)
      .map((row) => `${row.id}: ${row.concernTopic}`)
  };
}

export function buildRebuttalResponsePack(packet) {
  if (!packet?.manuscript || !Array.isArray(packet.reviews)) {
    throw new Error("A manuscript and review list are required.");
  }

  const responseMatrix = packet.reviews.map((review, index) => buildResponseRow(packet.manuscript, review, index));
  const concernClusters = clusterRows(responseMatrix);
  const resubmissionReadiness = readiness(responseMatrix);

  return {
    manuscriptId: packet.manuscript.id,
    title: packet.manuscript.title,
    decision: packet.manuscript.decision,
    responseMatrix,
    concernClusters,
    resubmissionReadiness,
    editorSummary: {
      responseCount: responseMatrix.length,
      highRiskResponses: responseMatrix.filter((row) => row.unresolvedRisk).map((row) => row.id),
      recommendedNextAction: resubmissionReadiness.status === "not-ready"
        ? "Resolve high-risk evidence gaps before resubmission."
        : "Prepare tracked-change manuscript and response letter."
    }
  };
}
