import type { CorpusPaper, ResearchGap, ResearchProject } from "../types.js"

function overlap(left: string[], right: string[]) {
  const rightSet = new Set(right.map((item) => item.toLowerCase()))
  return left.filter((item) => rightSet.has(item.toLowerCase()))
}

export function findResearchGaps(project: ResearchProject, corpus: CorpusPaper[]): ResearchGap[] {
  const related = corpus
    .map((paper) => ({
      paper,
      shared: overlap(project.keywords, paper.keywords)
    }))
    .filter((item) => item.shared.length > 0)

  const gaps = related.flatMap((item) => {
    const unresolved = item.paper.unresolvedQuestions.map((question, index) => {
      const noveltyScore = Math.min(100, Math.round(
        45 +
        item.shared.length * 12 +
        Math.max(0, 6 - item.paper.replicationCount) * 5 +
        Math.min(20, item.paper.citationCount / 10)
      ))

      return {
        id: `gap_${item.paper.id}_${index}`,
        title: question,
        rationale: `${item.paper.title} is related via ${item.shared.join(", ")} and has ${item.paper.replicationCount} replications.`,
        signal: "unresolved_question" as const,
        keywords: item.shared,
        noveltyScore,
        evidencePaperIds: [item.paper.id]
      }
    })

    const lowReplication = item.paper.replicationCount <= 1
      ? [{
          id: `gap_${item.paper.id}_replication`,
          title: `Replicate ${item.paper.title} with independent data`,
          rationale: `Topic cluster has ${item.paper.citationCount} citations but only ${item.paper.replicationCount} replication attempts.`,
          signal: "low_replication_cluster" as const,
          keywords: item.shared,
          noveltyScore: Math.min(100, 70 + item.shared.length * 6 + Math.min(18, item.paper.citationCount / 12)),
          evidencePaperIds: [item.paper.id]
        }]
      : []

    const negativeFollowUps = item.paper.negativeFindings.map((finding, index) => ({
      id: `gap_${item.paper.id}_negative_${index}`,
      title: `Follow up negative result: ${finding}`,
      rationale: `${item.paper.title} reports a limitation or negative result that suggests a targeted follow-up study.`,
      signal: "negative_result_follow_up" as const,
      keywords: item.shared,
      noveltyScore: Math.min(100, 68 + item.shared.length * 8 + Math.max(0, 5 - item.paper.replicationCount) * 4),
      evidencePaperIds: [item.paper.id]
    }))

    return [...unresolved, ...lowReplication, ...negativeFollowUps]
  })

  return gaps
    .sort((left, right) => right.noveltyScore - left.noveltyScore)
    .slice(0, 5)
}

export function weeklyDigest(project: ResearchProject, corpus: CorpusPaper[]) {
  const gaps = findResearchGaps(project, corpus)
  return {
    projectId: project.id,
    subject: `Research opportunities for ${project.title}`,
    highlights: gaps.map((gap) => `${gap.title} (${gap.noveltyScore}/100)`),
    topGap: gaps[0] ?? null
  }
}
