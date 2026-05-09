import {
  accounts,
  coupons,
  licensingContracts,
  pricingPlans,
  researchMetadataEvents
} from "./data/demo-data.js"
import { RevenueService } from "./lib/revenue-service.js"

export const revenueService = new RevenueService({
  plans: pricingPlans,
  coupons,
  accounts,
  licensingContracts,
  researchMetadataEvents
})

export * from "./types.js"
export * from "./lib/billing-engine.js"
export * from "./lib/licensing-engine.js"
export * from "./lib/revenue-service.js"
export * from "./lib/money.js"
