const assert = require("node:assert/strict")
const {
  buildRecommendationDigest,
  digest,
  findReproducibilityRoutes,
  scoreEdge,
} = require("./index")

function sampleGraph() {
  return {
    nodes: [
      { id: "concept-a", type: "concept", label: "Graph neural biomarker", domain: "biology" },
      { id: "dataset-open", type: "dataset", label: "Open cohort", domain: "biology" },
      { id: "notebook-open", type: "notebook", label: "Executable notebook", domain: "biology" },
      { id: "result-open", type: "result", label: "Validated signature", domain: "biology" },
      { id: "dataset-stale", type: "dataset", label: "Stale cohort", domain: "biology" },
      { id: "result-stale", type: "result", label: "Stale finding", domain: "biology" },
      { id: "dataset-physics", type: "dataset", label: "Physics cohort", domain: "physics" },
      { id: "result-physics", type: "result", label: "Physics result", domain: "physics" },
    ],
    edges: [
      {
        id: "open-1",
        from: "concept-a",
        to: "dataset-open",
        relation: "supported_by",
        evidenceStrength: 0.9,
        evidenceAgeDays: 20,
        citationCount: 300,
        access: "open",
        reproducibilityVerified: true,
      },
      {
        id: "open-2",
        from: "dataset-open",
        to: "notebook-open",
        relation: "reproduced_by",
        evidenceStrength: 0.88,
        evidenceAgeDays: 15,
        citationCount: 110,
        access: "open",
        executable: true,
        requiresRerun: true,
        reproducibilityVerified: true,
      },
      {
        id: "open-3",
        from: "notebook-open",
        to: "result-open",
        relation: "produces",
        evidenceStrength: 0.86,
        evidenceAgeDays: 10,
        citationCount: 80,
        access: "open",
        executable: true,
        reproducibilityVerified: true,
      },
      {
        id: "stale-1",
        from: "concept-a",
        to: "dataset-stale",
        relation: "supported_by",
        evidenceStrength: 0.45,
        evidenceAgeDays: 800,
        citationCount: 4,
        access: "restricted",
      },
      {
        id: "stale-2",
        from: "dataset-stale",
        to: "result-stale",
        relation: "produces",
        evidenceStrength: 0.4,
        evidenceAgeDays: 820,
        citationCount: 1,
        access: "private",
        requiresRerun: true,
        executable: false,
      },
      {
        id: "physics-1",
        from: "concept-a",
        to: "dataset-physics",
        relation: "analogous_to",
        evidenceStrength: 0.9,
        evidenceAgeDays: 10,
        citationCount: 50,
        access: "open",
      },
      {
        id: "physics-2",
        from: "dataset-physics",
        to: "result-physics",
        relation: "produces",
        evidenceStrength: 0.9,
        evidenceAgeDays: 10,
        citationCount: 50,
        access: "open",
        executable: true,
      },
    ],
  }
}

function testScoresStrongExecutableOpenEdgesHighest() {
  const strong = scoreEdge({
    evidenceStrength: 0.9,
    evidenceAgeDays: 10,
    citationCount: 200,
    access: "open",
    executable: true,
    reproducibilityVerified: true,
  })
  const weak = scoreEdge({
    evidenceStrength: 0.35,
    evidenceAgeDays: 900,
    citationCount: 0,
    access: "private",
    executable: false,
  })

  assert.ok(strong > 0.9)
  assert.ok(weak < 0.45)
}

function testFindsRankedReproducibilityRoute() {
  const [best] = findReproducibilityRoutes(sampleGraph(), {
    startId: "concept-a",
    targetTypes: ["result"],
    maxDepth: 4,
  })

  assert.equal(best.path.at(-1).id, "result-open")
  assert.equal(best.blockers.length, 0)
  assert.ok(best.score > 0.85)
}

function testWeakPrivateRouteProducesCuratorActions() {
  const routes = findReproducibilityRoutes(sampleGraph(), {
    startId: "concept-a",
    targetId: "result-stale",
    targetTypes: ["result"],
    maxDepth: 3,
  })

  assert.equal(routes.length, 1)
  assert.ok(routes[0].blockers.includes("stale_evidence"))
  assert.ok(routes[0].blockers.includes("access_limited"))
  assert.ok(routes[0].blockers.includes("rerun_not_executable"))
  assert.ok(routes[0].curatorActions.some((action) => action.includes("Refresh evidence")))
}

function testDomainFilterSuppressesOtherDomains() {
  const routes = findReproducibilityRoutes(sampleGraph(), {
    startId: "concept-a",
    targetTypes: ["result"],
    filters: { domain: "biology" },
    maxDepth: 3,
  })

  assert.equal(routes.some((route) => route.path.at(-1).id === "result-physics"), false)
}

function testRecommendationDigestExplainsRoutes() {
  const digestPacket = buildRecommendationDigest(sampleGraph(), {
    startId: "concept-a",
    targetTypes: ["result"],
    maxDepth: 4,
    context: "weekly_digest",
  })

  assert.equal(digestPacket.generatedFor, "weekly_digest")
  assert.ok(digestPacket.recommendations.length >= 2)
  assert.match(digestPacket.recommendations[0].headline, /Graph neural biomarker/)
  assert.equal(typeof digestPacket.auditDigest, "string")
}

function testStableDigestIgnoresObjectKeyOrder() {
  assert.equal(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }))
}

const tests = [
  testScoresStrongExecutableOpenEdgesHighest,
  testFindsRankedReproducibilityRoute,
  testWeakPrivateRouteProducesCuratorActions,
  testDomainFilterSuppressesOtherDomains,
  testRecommendationDigestExplainsRoutes,
  testStableDigestIgnoresObjectKeyOrder,
]

for (const test of tests) {
  test()
  console.log(`ok - ${test.name}`)
}

console.log(`${tests.length} tests passed`)
