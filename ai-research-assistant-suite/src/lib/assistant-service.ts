import type { CorpusPaper, ResearchProject } from "../types.js"
import { findResearchGaps, weeklyDigest } from "./gap-finder.js"
import { generatePeerReview } from "./peer-review.js"
import { runReproducibilityChecks } from "./reproducibility.js"

export interface AssistantStore {
  projects: ResearchProject[]
  corpus: CorpusPaper[]
}

export class AssistantService {
  constructor(private readonly store: AssistantStore) {}

  listProjects() {
    return this.store.projects.map((project) => ({
      id: project.id,
      title: project.title,
      domain: project.domain,
      keywords: project.keywords
    }))
  }

  getProject(projectId: string) {
    const project = this.store.projects.find((candidate) => candidate.id === projectId)
    if (!project) throw new Error(`Unknown project: ${projectId}`)
    return project
  }

  review(projectId: string) {
    return generatePeerReview(this.getProject(projectId))
  }

  reproduce(projectId: string) {
    return runReproducibilityChecks(this.getProject(projectId))
  }

  gaps(projectId: string) {
    return findResearchGaps(this.getProject(projectId), this.store.corpus)
  }

  digest(projectId: string) {
    return weeklyDigest(this.getProject(projectId), this.store.corpus)
  }

  projectDashboard(projectId: string) {
    const project = this.getProject(projectId)
    const review = this.review(projectId)
    const reproducibility = this.reproduce(projectId)
    const gaps = this.gaps(projectId)
    return {
      project,
      review,
      reproducibility,
      gaps,
      readinessScore: Math.round((review.score + reproducibility.confidenceScore + (gaps[0]?.noveltyScore ?? 0)) / 3)
    }
  }
}
