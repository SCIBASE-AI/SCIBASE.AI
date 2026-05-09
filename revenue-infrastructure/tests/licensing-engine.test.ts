import { describe, expect, it } from "vitest"
import { licensingContracts, researchMetadataEvents } from "../src/data/demo-data.js"
import {
  activeContractsForAccount,
  aggregateMetadata,
  buildLicensingExport
} from "../src/lib/licensing-engine.js"

describe("licensing engine", () => {
  it("returns active contracts for an institutional account", () => {
    const contracts = activeContractsForAccount(
      licensingContracts,
      "acct_institution_eu",
      "2026-05-09T00:00:00.000Z"
    )

    expect(contracts).toHaveLength(2)
    expect(contracts.map((contract) => contract.product)).toContain("trend_dashboard")
  })

  it("aggregates metadata and excludes private content", () => {
    const rows = aggregateMetadata(researchMetadataEvents)

    expect(rows.some((row) => row.domain === "medicine")).toBe(false)
    expect(rows.some((row) => row.domain === "climate")).toBe(true)
  })

  it("builds a privacy-safe licensing export", () => {
    const contract = licensingContracts[0]
    const exportPayload = buildLicensingExport(contract, researchMetadataEvents, "2026-05-09T00:00:00.000Z")

    expect(exportPayload.customerName).toBe(contract.customerName)
    expect(exportPayload.privacy.privateEventsExcluded).toBe(1)
    expect(exportPayload.privacy.rawPrivateContentIncluded).toBe(false)
    expect(exportPayload.rows.length).toBeGreaterThan(0)
  })
})
