const { buildRecommendationDigest, findReproducibilityRoutes } = require("./index")

const graph = {
  nodes: [
    { id: "concept-crispr", type: "concept", label: "CRISPR perturbation", domain: "biology" },
    { id: "protocol-10x", type: "protocol", label: "10x guide capture protocol", domain: "biology" },
    { id: "dataset-neuro", type: "dataset", label: "Neuroscience perturb-seq dataset", domain: "biology" },
    { id: "notebook-cluster", type: "notebook", label: "Clustering replay notebook", domain: "biology" },
    { id: "software-scanpy", type: "software", label: "Scanpy workflow", domain: "biology" },
    { id: "result-cell-state", type: "result", label: "Cell-state transition map", domain: "biology" },
    { id: "dataset-private", type: "dataset", label: "Restricted validation cohort", domain: "biology" },
    { id: "result-private", type: "result", label: "Embargoed validation result", domain: "biology" },
  ],
  edges: [
    {
      id: "e1",
      from: "concept-crispr",
      to: "protocol-10x",
      relation: "uses_protocol",
      evidenceStrength: 0.92,
      citationCount: 180,
      evidenceAgeDays: 45,
      access: "open",
      usageContexts: ["protocol entity page", "project sidebar"],
    },
    {
      id: "e2",
      from: "protocol-10x",
      to: "dataset-neuro",
      relation: "generated_dataset",
      evidenceStrength: 0.9,
      citationCount: 120,
      evidenceAgeDays: 80,
      access: "open",
      reproducibilityVerified: true,
      usageContexts: ["dataset reuse"],
    },
    {
      id: "e3",
      from: "dataset-neuro",
      to: "notebook-cluster",
      relation: "reproduced_by",
      evidenceStrength: 0.88,
      citationCount: 90,
      evidenceAgeDays: 22,
      access: "open",
      executable: true,
      requiresRerun: true,
      reproducibilityVerified: true,
      usageContexts: ["run analysis"],
    },
    {
      id: "e4",
      from: "notebook-cluster",
      to: "software-scanpy",
      relation: "depends_on",
      evidenceStrength: 0.8,
      citationCount: 60,
      evidenceAgeDays: 18,
      access: "open",
      executable: true,
      usageContexts: ["environment plan"],
    },
    {
      id: "e5",
      from: "software-scanpy",
      to: "result-cell-state",
      relation: "produces_result",
      evidenceStrength: 0.87,
      citationCount: 75,
      evidenceAgeDays: 18,
      access: "open",
      executable: true,
      reproducibilityVerified: true,
      usageContexts: ["result entity page"],
    },
    {
      id: "e6",
      from: "concept-crispr",
      to: "dataset-private",
      relation: "validated_by",
      evidenceStrength: 0.56,
      citationCount: 12,
      evidenceAgeDays: 500,
      access: "restricted",
      usageContexts: ["curator review"],
    },
    {
      id: "e7",
      from: "dataset-private",
      to: "result-private",
      relation: "supports_result",
      evidenceStrength: 0.48,
      citationCount: 8,
      evidenceAgeDays: 510,
      access: "private",
      requiresRerun: true,
      executable: false,
      usageContexts: ["curator review"],
    },
  ],
}

const routes = findReproducibilityRoutes(graph, {
  startId: "concept-crispr",
  targetTypes: ["result"],
  maxDepth: 5,
  limit: 5,
})

const digest = buildRecommendationDigest(graph, {
  startId: "concept-crispr",
  targetTypes: ["result"],
  maxDepth: 5,
  context: "project_sidebar",
})

console.log("Ranked reproducibility routes")
console.log(JSON.stringify(routes, null, 2))
console.log("\nRecommendation digest")
console.log(JSON.stringify(digest, null, 2))
