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
    return item.paper.unresolvedQuestions.map((question, index) => {
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
        keywords: item.shared,
        noveltyScore,
        evidencePaperIds: [item.paper.id]
      }
    })
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
