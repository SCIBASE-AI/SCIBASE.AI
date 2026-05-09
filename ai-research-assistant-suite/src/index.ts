import { corpus, projects } from "./data/demo-data.js"
import { AssistantService } from "./lib/assistant-service.js"

export const assistantService = new AssistantService({ projects, corpus })

export * from "./types.js"
export * from "./lib/assistant-service.js"
export * from "./lib/gap-finder.js"
export * from "./lib/peer-review.js"
export * from "./lib/reproducibility.js"
