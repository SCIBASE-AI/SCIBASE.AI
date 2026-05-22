import { createHash } from "node:crypto"

export function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`
  }
  return JSON.stringify(value)
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex")
}

export function buildIdempotencyKey(event) {
  return sha256(
    stableStringify({
      accountId: event.accountId,
      operation: event.operation,
      model: event.model,
      promptHash: event.promptHash,
      params: event.params,
      toolName: event.toolName ?? null,
      toolArgsHash: event.toolArgsHash ?? null,
      sourceDocumentId: event.sourceDocumentId ?? null,
    }),
  )
}

export function buildAttributionKey(event) {
  const day = event.startedAt.slice(0, 10)
  return [event.accountId, event.sourceDocumentId ?? event.requestId, day].join(":")
}

function centsFor(event, policy) {
  const tokenCents =
    ((event.inputTokens ?? 0) + (event.outputTokens ?? 0)) *
    policy.centsPerToken
  const wallCents =
    ((event.wallClockMs ?? 0) / 60000) * policy.centsPerWallMinute
  return Math.round((tokenCents + wallCents) * 100) / 100
}

function chooseBillableEvent(events) {
  return (
    events.find((event) => event.lifecycle === "tool_result" && event.status === "success") ??
    events.find((event) => event.lifecycle === "completion" && event.status === "success") ??
    events.find((event) => event.status === "success")
  )
}

function evaluateGroup(events, policy) {
  const billableEvent = chooseBillableEvent(events)
  const hasOrphanedToolUse =
    events.some((event) => event.lifecycle === "tool_use") &&
    !events.some((event) => event.lifecycle === "tool_result")
  const hasFailedRetry = events.some((event) => event.lifecycle === "retry")
  const statuses = new Set(events.map((event) => event.status))
  const rawCents = events.reduce((sum, event) => sum + centsFor(event, policy), 0)

  if (hasOrphanedToolUse) {
    return {
      action: "hold",
      reason: "orphaned_tool_call",
      billableCents: 0,
      rawCents,
      retainedEventId: null,
      finding:
        "Tool call emitted without a matching result. Hold billing until retry/result reconciliation is explicit.",
    }
  }

  if (!billableEvent) {
    return {
      action: "hold",
      reason: `no_successful_terminal_event:${[...statuses].sort().join("|")}`,
      billableCents: 0,
      rawCents,
      retainedEventId: null,
      finding: "No successful terminal event was found for this idempotency group.",
    }
  }

  const billableCents = centsFor(billableEvent, policy)
  const duplicateCount = Math.max(0, events.length - 1)
  return {
    action: hasFailedRetry || duplicateCount > 0 ? "collapse" : "invoice",
    reason:
      hasFailedRetry || duplicateCount > 0
        ? "content_hash_retry_collapse"
        : "single_terminal_event",
    billableCents,
    rawCents,
    retainedEventId: billableEvent.id,
    finding:
      duplicateCount > 0
        ? `${duplicateCount} retry or duplicate rows collapsed behind one content-hash meter row.`
        : "Single terminal meter row is invoice-ready.",
  }
}

function evaluateSourceInflation(events, policy) {
  const rawByAccount = new Map()
  const distinctByAccount = new Map()

  for (const event of events) {
    if (event.excludeFromAttribution) continue
    rawByAccount.set(event.accountId, (rawByAccount.get(event.accountId) ?? 0) + 1)
    if (!distinctByAccount.has(event.accountId)) {
      distinctByAccount.set(event.accountId, new Set())
    }
    distinctByAccount.get(event.accountId).add(buildAttributionKey(event))
  }

  const findings = []
  for (const [accountId, rawCount] of rawByAccount.entries()) {
    const distinctCount = distinctByAccount.get(accountId)?.size ?? 0
    const ratio = distinctCount === 0 ? rawCount : rawCount / distinctCount
    if (ratio >= policy.rawToDistinctInflationThreshold) {
      findings.push({
        accountId,
        severity: "high",
        code: "raw_count_inflation",
        rawCount,
        distinctCount,
        ratio: Number(ratio.toFixed(2)),
        message:
          "Raw compute events materially exceed distinct account/source/day attribution. Review before invoicing usage counts.",
      })
    }
  }
  return findings
}

function evaluateReproducibilityRuns(events) {
  const findingsByKey = new Map()
  for (const event of events) {
    if (
      event.operation !== "reproducibility_check" ||
      event.reproducibility?.deterministic !== false ||
      event.reproducibility?.billingScope
    ) {
      continue
    }

    const key = [
      event.accountId,
      event.sourceDocumentId ?? event.requestId,
      event.operation,
    ].join(":")
    if (!findingsByKey.has(key)) {
      findingsByKey.set(key, {
        accountId: event.accountId,
        severity: "critical",
        code: "rerun_scope_undefined",
        eventIds: [],
        message:
          "Nondeterministic reproducibility reruns lack a billing-scope policy. Hold charges until run-vs-verified-output responsibility is defined.",
      })
    }
    findingsByKey.get(key).eventIds.push(event.id)
  }

  return [...findingsByKey.values()].map((finding) => ({
    ...finding,
    eventIds: finding.eventIds.sort(),
  }))
}

function allocateInvoiceDecision(summary, accountControl = {}) {
  const includedComputeCents = accountControl.includedComputeCents ?? 0
  const topUpBalanceCents = accountControl.topUpBalanceCents ?? 0
  const billableCents = summary.billableCents

  const includedUsageAppliedCents =
    summary.status === "hold" ? 0 : Math.min(billableCents, includedComputeCents)
  const afterIncludedCents = Math.max(0, billableCents - includedUsageAppliedCents)
  const topUpAppliedCents =
    summary.status === "hold" ? 0 : Math.min(afterIncludedCents, topUpBalanceCents)
  const invoiceCents =
    summary.status === "hold"
      ? 0
      : Number(Math.max(0, afterIncludedCents - topUpAppliedCents).toFixed(2))
  const quotaRemainingCents =
    summary.status === "hold"
      ? includedComputeCents
      : Number(Math.max(0, includedComputeCents - includedUsageAppliedCents).toFixed(2))
  const topUpRemainingCents =
    summary.status === "hold"
      ? topUpBalanceCents
      : Number(Math.max(0, topUpBalanceCents - topUpAppliedCents).toFixed(2))

  if (summary.status === "hold") {
    return {
      plan: accountControl.plan ?? "unknown",
      paymentRail: accountControl.paymentRail ?? "unknown",
      includedUsageAppliedCents,
      topUpAppliedCents,
      invoiceCents,
      quotaRemainingCents,
      topUpRemainingCents,
      billingDecision: "hold_invoice",
      financeAction:
        "Do not release invoice-facing AI compute revenue until critical billing findings are resolved.",
    }
  }

  return {
    plan: accountControl.plan ?? "unknown",
    paymentRail: accountControl.paymentRail ?? "unknown",
    includedUsageAppliedCents: Number(includedUsageAppliedCents.toFixed(2)),
    topUpAppliedCents: Number(topUpAppliedCents.toFixed(2)),
    invoiceCents,
    quotaRemainingCents,
    topUpRemainingCents,
    billingDecision:
      invoiceCents > 0 ? "invoice_overage" : "covered_by_subscription_or_topup",
    financeAction:
      invoiceCents > 0
        ? "Release the reconciled overage after raw-vs-attributed review."
        : "Post usage against included quota or prepaid top-up without issuing a new overage invoice.",
  }
}

export function evaluateComputeBilling(events, policy, accountControls = {}) {
  const groups = new Map()
  for (const event of events) {
    const key = buildIdempotencyKey(event)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push({ ...event, idempotencyKey: key })
  }

  const reproducibilityFindings = evaluateReproducibilityRuns(events)
  const reproducibilityHoldEventIds = new Set(
    reproducibilityFindings.flatMap((finding) => finding.eventIds),
  )
  const meterRows = []
  const groupFindings = []
  for (const [idempotencyKey, groupedEvents] of groups.entries()) {
    const result = evaluateGroup(groupedEvents, policy)
    const hasUndefinedReproducibilityScope = groupedEvents.some((event) =>
      reproducibilityHoldEventIds.has(event.id),
    )
    const action = hasUndefinedReproducibilityScope ? "hold" : result.action
    const reason = hasUndefinedReproducibilityScope
      ? "rerun_scope_undefined"
      : result.reason
    const billableCents = hasUndefinedReproducibilityScope
      ? 0
      : result.billableCents
    const retainedEventId = hasUndefinedReproducibilityScope
      ? null
      : result.retainedEventId
    meterRows.push({
      idempotencyKey,
      accountId: groupedEvents[0].accountId,
      operation: groupedEvents[0].operation,
      eventIds: groupedEvents.map((event) => event.id).sort(),
      retainedEventId,
      action,
      reason,
      rawCents: Number(result.rawCents.toFixed(2)),
      billableCents: Number(billableCents.toFixed(2)),
      avoidedOverbillCents: Number(
        Math.max(0, result.rawCents - billableCents).toFixed(2),
      ),
    })
    groupFindings.push({
      accountId: groupedEvents[0].accountId,
      severity: action === "hold" ? "critical" : "info",
      code: reason,
      idempotencyKey,
      message: hasUndefinedReproducibilityScope
        ? "Nondeterministic reproducibility events share an undefined billing scope. Hold the invoice row until finance defines run-vs-verified-output responsibility."
        : result.finding,
    })
  }

  const findings = [
    ...groupFindings,
    ...evaluateSourceInflation(events, policy),
    ...reproducibilityFindings,
  ]
  const heldAccountIds = new Set(
    findings
      .filter((finding) => finding.severity === "critical")
      .map((finding) => finding.accountId),
  )

  const accountSummaries = [...new Set(events.map((event) => event.accountId))]
    .sort()
    .map((accountId) => {
      const rows = meterRows.filter((row) => row.accountId === accountId)
      const criticalFindings = findings.filter(
        (finding) =>
          finding.accountId === accountId && finding.severity === "critical",
      )
      const summary = {
        accountId,
        status: criticalFindings.length > 0 ? "hold" : "ready",
        billableCents: Number(
          rows.reduce((sum, row) => sum + row.billableCents, 0).toFixed(2),
        ),
        avoidedOverbillCents: Number(
          rows
            .reduce((sum, row) => sum + row.avoidedOverbillCents, 0)
            .toFixed(2),
        ),
        meterRows: rows.length,
        criticalFindings: criticalFindings.length,
      }
      return {
        ...summary,
        ...allocateInvoiceDecision(summary, accountControls[accountId]),
      }
    })

  const invoiceCents = accountSummaries.reduce(
    (sum, summary) => sum + summary.invoiceCents,
    0,
  )
  const report = {
    status: heldAccountIds.size > 0 ? "finance_review_required" : "invoice_ready",
    generatedAt: policy.generatedAt,
    totals: {
      rawEvents: events.length,
      idempotencyGroups: groups.size,
      heldRows: meterRows.filter((row) => row.action === "hold").length,
      collapsedRows: meterRows.filter((row) => row.action === "collapse").length,
      billableCents: Number(
        meterRows.reduce((sum, row) => sum + row.billableCents, 0).toFixed(2),
      ),
      avoidedOverbillCents: Number(
        meterRows
          .reduce((sum, row) => sum + row.avoidedOverbillCents, 0)
          .toFixed(2),
      ),
      invoiceCents: Number(invoiceCents.toFixed(2)),
      heldInvoiceAccounts: accountSummaries.filter(
        (summary) => summary.billingDecision === "hold_invoice",
      ).length,
    },
    accountSummaries,
    meterRows,
    findings,
  }

  return {
    ...report,
    auditDigest: sha256(stableStringify(report)),
  }
}
