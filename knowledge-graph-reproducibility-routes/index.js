const crypto = require("node:crypto")

const NODE_WEIGHTS = {
  concept: 0.7,
  protocol: 0.9,
  dataset: 1,
  notebook: 1,
  software: 0.85,
  result: 1,
  project: 0.75,
  author: 0.55,
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`
  }
  return JSON.stringify(value)
}

function digest(value) {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex")
}

function indexById(items) {
  return new Map(items.map((item) => [item.id, item]))
}

function edgeFreshnessScore(edge) {
  if (edge.retracted) return 0
  if (edge.evidenceAgeDays == null) return 0.65
  if (edge.evidenceAgeDays <= 30) return 1
  if (edge.evidenceAgeDays <= 180) return 0.85
  if (edge.evidenceAgeDays <= 365) return 0.65
  return 0.4
}

function edgeAccessScore(edge) {
  if (edge.access === "open") return 1
  if (edge.access === "registered") return 0.8
  if (edge.access === "restricted") return 0.45
  if (edge.access === "private") return 0.2
  return 0.6
}

function edgeEvidenceScore(edge) {
  const base = (edge.evidenceStrength ?? 0.5) * 0.72
  const citationBoost = Math.min((edge.citationCount ?? 0) / 250, 1) * 0.1
  const reproducibilityBoost = edge.reproducibilityVerified ? 0.11 : 0
  const executableBoost = edge.executable ? 0.07 : 0
  return Math.min(base + citationBoost + reproducibilityBoost + executableBoost, 1)
}

function scoreEdge(edge) {
  const evidence = edgeEvidenceScore(edge)
  const freshness = edgeFreshnessScore(edge)
  const access = edgeAccessScore(edge)
  return Number((evidence * 0.5 + freshness * 0.3 + access * 0.2).toFixed(4))
}

function edgeBlockers(edge) {
  const blockers = []
  if (edge.retracted) blockers.push("evidence_retracted")
  if (edge.evidenceAgeDays > 365) blockers.push("stale_evidence")
  if (edge.access === "private" || edge.access === "restricted") blockers.push("access_limited")
  if (edge.requiresRerun && !edge.executable) blockers.push("rerun_not_executable")
  if ((edge.evidenceStrength ?? 0) < 0.5) blockers.push("weak_evidence")
  return blockers
}

function buildAdjacency(edges) {
  const adjacency = new Map()
  for (const edge of edges) {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, [])
    adjacency.get(edge.from).push(edge)
  }
  return adjacency
}

function walkRoutes(graph, options) {
  const nodes = indexById(graph.nodes)
  const adjacency = buildAdjacency(graph.edges)
  const maxDepth = options.maxDepth ?? 5
  const queue = [{ nodeId: options.startId, edges: [], seen: new Set([options.startId]) }]
  const routes = []

  while (queue.length > 0) {
    const current = queue.shift()
    const node = nodes.get(current.nodeId)
    if (!node) continue

    const isTarget =
      current.edges.length > 0 &&
      (!options.targetTypes || options.targetTypes.includes(node.type)) &&
      (!options.targetId || current.nodeId === options.targetId)

    if (isTarget) routes.push(current)
    if (current.edges.length >= maxDepth) continue

    for (const edge of adjacency.get(current.nodeId) || []) {
      if (current.seen.has(edge.to)) continue
      const next = nodes.get(edge.to)
      if (!next) continue
      if (options.domain && next.domain && next.domain !== options.domain) continue
      queue.push({
        nodeId: edge.to,
        edges: [...current.edges, edge],
        seen: new Set([...current.seen, edge.to]),
      })
    }
  }

  return routes
}

function scoreRoute(route, nodes) {
  const edgeScores = route.edges.map(scoreEdge)
  const nodeScores = route.edges.map((edge) => NODE_WEIGHTS[nodes.get(edge.to)?.type] ?? 0.6)
  const meanEdgeScore = edgeScores.reduce((sum, score) => sum + score, 0) / edgeScores.length
  const meanNodeScore = nodeScores.reduce((sum, score) => sum + score, 0) / nodeScores.length
  const lengthPenalty = Math.max(0, (route.edges.length - 3) * 0.04)
  const blockers = route.edges.flatMap(edgeBlockers)
  const blockerPenalty = Math.min(blockers.length * 0.08, 0.4)
  return Number(Math.max(meanEdgeScore * 0.72 + meanNodeScore * 0.28 - lengthPenalty - blockerPenalty, 0).toFixed(4))
}

function routeCuratorActions(route) {
  const actions = []
  for (const edge of route.edges) {
    for (const blocker of edgeBlockers(edge)) {
      if (blocker === "evidence_retracted") {
        actions.push(`Suppress ${edge.from}->${edge.to} until retraction is reviewed.`)
      }
      if (blocker === "stale_evidence") {
        actions.push(`Refresh evidence for ${edge.from}->${edge.to}.`)
      }
      if (blocker === "access_limited") {
        actions.push(`Request access policy review for ${edge.to}.`)
      }
      if (blocker === "rerun_not_executable") {
        actions.push(`Add executable environment metadata for ${edge.to}.`)
      }
      if (blocker === "weak_evidence") {
        actions.push(`Add stronger supporting citation or artifact evidence for ${edge.from}->${edge.to}.`)
      }
    }
  }
  return [...new Set(actions)]
}

function formatRoute(route, graph) {
  const nodes = indexById(graph.nodes)
  const pathIds = [route.edges[0].from, ...route.edges.map((edge) => edge.to)]
  const path = pathIds.map((id) => {
    const node = nodes.get(id)
    return {
      id,
      type: node?.type,
      label: node?.label,
      domain: node?.domain,
    }
  })
  const blockers = [...new Set(route.edges.flatMap(edgeBlockers))]
  const packet = {
    routeId: digest({ pathIds, edges: route.edges.map((edge) => edge.id) }).slice(0, 16),
    path,
    score: scoreRoute(route, nodes),
    blockers,
    usageContexts: route.edges.flatMap((edge) => edge.usageContexts || []),
    evidence: route.edges.map((edge) => ({
      id: edge.id,
      relation: edge.relation,
      from: edge.from,
      to: edge.to,
      score: scoreEdge(edge),
      citationCount: edge.citationCount ?? 0,
      evidenceAgeDays: edge.evidenceAgeDays ?? null,
      access: edge.access || "unknown",
      executable: Boolean(edge.executable),
      reproducibilityVerified: Boolean(edge.reproducibilityVerified),
    })),
    curatorActions: routeCuratorActions(route),
  }

  return {
    ...packet,
    auditDigest: digest(packet),
  }
}

function findReproducibilityRoutes(graph, options) {
  if (!options?.startId) throw new Error("startId is required")
  const filters = options.filters || {}
  const rawRoutes = walkRoutes(graph, {
    startId: options.startId,
    targetId: options.targetId,
    targetTypes: options.targetTypes || ["result", "notebook", "dataset", "project"],
    maxDepth: options.maxDepth,
    domain: filters.domain,
  })

  return rawRoutes
    .map((route) => formatRoute(route, graph))
    .filter((route) => route.score >= (filters.minScore ?? 0))
    .filter((route) =>
      filters.access ? route.evidence.every((evidence) => evidence.access === filters.access) : true,
    )
    .filter((route) =>
      filters.minCitationCount
        ? route.evidence.some((evidence) => evidence.citationCount >= filters.minCitationCount)
        : true,
    )
    .filter((route) =>
      filters.maxEvidenceAgeDays
        ? route.evidence.every(
            (evidence) =>
              evidence.evidenceAgeDays == null || evidence.evidenceAgeDays <= filters.maxEvidenceAgeDays,
          )
        : true,
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit ?? 10)
}

function buildRecommendationDigest(graph, options) {
  const routes = findReproducibilityRoutes(graph, options)
  return {
    startId: options.startId,
    generatedFor: options.context || "discovery_mode",
    totalRoutes: routes.length,
    recommendations: routes.map((route) => ({
      routeId: route.routeId,
      headline: `${route.path[0].label} -> ${route.path.at(-1).label}`,
      score: route.score,
      reason:
        route.blockers.length === 0
          ? "High-confidence reproducibility path with reusable evidence."
          : "Useful path with curator actions before full reuse.",
      blockers: route.blockers,
      curatorActions: route.curatorActions,
      path: route.path.map((node) => `${node.type}:${node.label}`),
    })),
    auditDigest: digest(routes.map((route) => route.auditDigest)),
  }
}

module.exports = {
  buildRecommendationDigest,
  digest,
  findReproducibilityRoutes,
  scoreEdge,
  stableJson,
}
