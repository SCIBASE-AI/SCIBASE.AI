import assert from "node:assert/strict"
import { describe, it } from "node:test"
import workspace from "../data/sample-workspace.json" with { type: "json" }
import { auditDigest, evaluateComputeMargins } from "../src/compute-margin-guard.js"

describe("AI compute margin guard", () => {
  it("clears a healthy account with known provider costs", () => {
    const packet = evaluateComputeMargins(workspace)
    const account = packet.accounts.find((entry) => entry.accountId === "acct-northbridge-lab")

    assert.equal(account.status, "clear")
    assert.ok(account.grossMarginPct >= account.requiredMarginPct)
    assert.equal(account.unknownSkuCount, undefined)
  })

  it("holds an enterprise account below margin and budget floors", () => {
    const packet = evaluateComputeMargins(workspace)
    const account = packet.accounts.find((entry) => entry.accountId === "acct-riverbend-institute")

    assert.equal(account.status, "hold")
    assert.ok(account.holdReasons.includes("gross-margin-below-floor"))
    assert.ok(account.holdReasons.includes("grant-budget-warning"))
    assert.ok(account.holdReasons.includes("unpaid-top-up-balance"))
  })

  it("holds jobs with unknown provider SKUs", () => {
    const packet = evaluateComputeMargins(workspace)
    const account = packet.accounts.find((entry) => entry.accountId === "acct-civic-bio")

    assert.equal(account.status, "hold")
    assert.ok(account.holdReasons.includes("unknown-provider-sku"))
    assert.equal(packet.totals.unknownSkuCount, 1)
  })

  it("recommends cheaper compatible provider routing", () => {
    const packet = evaluateComputeMargins(workspace)
    const recommendation = packet.routeRecommendations.find((entry) => entry.jobId === "job-rb-repro-2")

    assert.equal(recommendation.fromSku, "gpu-repro-a100")
    assert.equal(recommendation.toSku, "gpu-repro-l4")
    assert.ok(recommendation.estimatedHourlyDeltaUsd > 0)
  })

  it("builds deterministic audit digests", () => {
    const first = evaluateComputeMargins(workspace)
    const second = evaluateComputeMargins(workspace)

    assert.equal(first.auditDigest, second.auditDigest)
    assert.equal(auditDigest(first.accounts[0]), auditDigest(second.accounts[0]))
  })

  it("allows stricter policy overrides", () => {
    const packet = evaluateComputeMargins(workspace, {
      marginPolicy: {
        defaultFloorPct: 99
      }
    })
    const account = packet.accounts.find((entry) => entry.accountId === "acct-northbridge-lab")

    assert.equal(account.status, "hold")
    assert.ok(account.holdReasons.includes("gross-margin-below-floor"))
  })
})
