import { challenges, reviewDecisions, submissions } from "./data/demo-data.js"
import { BountyService } from "./lib/bounty-service.js"

export const bountyService = new BountyService({
  challenges,
  submissions,
  reviews: reviewDecisions
})

export * from "./types.js"
export * from "./lib/bounty-engine.js"
export * from "./lib/bounty-service.js"
export * from "./lib/money.js"
