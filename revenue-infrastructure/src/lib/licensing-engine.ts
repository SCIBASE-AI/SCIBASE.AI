import type { LicensingContract, ResearchMetadataEvent } from "../types.js"

export interface LicensingExport {
  generatedAt: string
  contractId: string
  customerName: string
  product: LicensingContract["product"]
  accessScope: string[]
  rows: Array<{
    domain: string
    region: string
    institutionType: string
    method: string
    projectCount: number
    avgReproducibilityScore: number
    citations: number
    datasetReuseCount: number
  }>
  privacy: {
    privateEventsExcluded: number
    aggregationOnly: true
    rawPrivateContentIncluded: false
  }
}

export function activeContractsForAccount(contracts: LicensingContract[], accountId: string, now = new Date().toISOString()) {
  const timestamp = new Date(now).getTime()
  return contracts.filter((contract) => {
    const started = new Date(contract.startedAt).getTime()
    const expires = new Date(contract.expiresAt).getTime()
    return contract.accountId === accountId && started <= timestamp && expires > timestamp
  })
}

export function aggregateMetadata(events: ResearchMetadataEvent[]) {
  const visibleEvents = events.filter((event) => !event.containsPrivateContent)
  const buckets = new Map<string, {
    domain: string
    region: string
    institutionType: string
    method: string
    projectIds: Set<string>
    reproducibilityScoreTotal: number
    citations: number
    datasetReuseCount: number
  }>()

  for (const event of visibleEvents) {
    const key = [event.domain, event.region, event.institutionType, event.method].join("|")
    const bucket = buckets.get(key) ?? {
      domain: event.domain,
      region: event.region,
      institutionType: event.institutionType,
      method: event.method,
      projectIds: new Set<string>(),
      reproducibilityScoreTotal: 0,
      citations: 0,
      datasetReuseCount: 0
    }
    bucket.projectIds.add(event.projectId)
    bucket.reproducibilityScoreTotal += event.reproducibilityScore
    bucket.citations += event.citationCount
    bucket.datasetReuseCount += event.datasetReuseCount
    buckets.set(key, bucket)
  }

  return [...buckets.values()].map((bucket) => ({
    domain: bucket.domain,
    region: bucket.region,
    institutionType: bucket.institutionType,
    method: bucket.method,
    projectCount: bucket.projectIds.size,
    avgReproducibilityScore: Number((bucket.reproducibilityScoreTotal / bucket.projectIds.size).toFixed(3)),
    citations: bucket.citations,
    datasetReuseCount: bucket.datasetReuseCount
  }))
}

export function buildLicensingExport(
  contract: LicensingContract,
  events: ResearchMetadataEvent[],
  generatedAt = new Date().toISOString()
): LicensingExport {
  const privateEventsExcluded = events.filter((event) => event.containsPrivateContent).length
  return {
    generatedAt,
    contractId: contract.id,
    customerName: contract.customerName,
    product: contract.product,
    accessScope: contract.accessScope,
    rows: aggregateMetadata(events),
    privacy: {
      privateEventsExcluded,
      aggregationOnly: true,
      rawPrivateContentIncluded: false
    }
  }
}

export function licenseAnnualRunRate(contracts: LicensingContract[], now = new Date().toISOString()): number {
  const timestamp = new Date(now).getTime()
  return contracts
    .filter((contract) => new Date(contract.startedAt).getTime() <= timestamp && new Date(contract.expiresAt).getTime() > timestamp)
    .reduce((sum, contract) => sum + contract.annualFeeCents, 0)
}
