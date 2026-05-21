const crypto = require("node:crypto");

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digestFor(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function verifiedPayment(account) {
  return Boolean(account?.paymentMethod?.verified);
}

function centsForDiscount(subtotalCents, discountPct) {
  return Math.round((subtotalCents * discountPct) / 100);
}

function severityStatus(reasons) {
  if (reasons.some((reason) => reason.severity === "reject")) {
    return "rejected";
  }
  if (reasons.some((reason) => reason.severity === "hold")) {
    return "hold";
  }
  if (reasons.some((reason) => reason.severity === "review")) {
    return "review";
  }
  return "approved";
}

function addReason(reasons, severity, code, message) {
  reasons.push({severity, code, message});
}

function buildPromotionContext(accounts) {
  return {
    trialsByDomain: new Map(),
    trialsByPaymentFingerprint: new Map(),
    accountById: new Map(accounts.map((account) => [account.id, account])),
  };
}

function rememberTrial(account, context) {
  if (!account) {
    return;
  }
  const domainTrials = context.trialsByDomain.get(account.domain) ?? [];
  domainTrials.push(account.id);
  context.trialsByDomain.set(account.domain, domainTrials);

  const fingerprint = account.paymentMethod?.fingerprint;
  if (fingerprint) {
    const paymentTrials = context.trialsByPaymentFingerprint.get(fingerprint) ?? [];
    paymentTrials.push(account.id);
    context.trialsByPaymentFingerprint.set(fingerprint, paymentTrials);
  }
}

function validateTrialStart(event, account, policy, context) {
  const reasons = [];
  const domainTrials = context.trialsByDomain.get(account.domain) ?? [];
  if (policy.disposableDomains.includes(account.domain)) {
    addReason(
      reasons,
      "reject",
      "disposable_domain",
      "Trial uses a disposable or non-institutional email domain.",
    );
  }
  if (domainTrials.length >= policy.maxTrialsPerInstitutionDomain) {
    addReason(
      reasons,
      "hold",
      "domain_trial_reuse",
      `Domain ${account.domain} already has ${domainTrials.length} trial workspace.`,
    );
  }
  const fingerprint = account.paymentMethod?.fingerprint;
  const paymentTrials = fingerprint ? context.trialsByPaymentFingerprint.get(fingerprint) ?? [] : [];
  if (fingerprint && paymentTrials.length >= policy.maxTrialsPerPaymentFingerprint) {
    addReason(
      reasons,
      "hold",
      "payment_trial_reuse",
      "Payment fingerprint was already used for a previous trial.",
    );
  }
  return reasons;
}

function validatePromotion(event, account, invoice, policy) {
  const reasons = [];
  const coupons = event.coupons ?? [];
  let requestedDiscountPct = 0;
  const definitions = coupons.map((coupon) => {
    const definition = policy.promotions[coupon];
    if (!definition) {
      addReason(reasons, "reject", "unknown_coupon", `Coupon ${coupon} is not configured.`);
      return null;
    }
    requestedDiscountPct += definition.discountPct;
    return {coupon, ...definition};
  }).filter(Boolean);

  if (definitions.length > policy.maxStackedPromotions) {
    addReason(
      reasons,
      "hold",
      "coupon_stack_exceeds_policy",
      `${definitions.length} coupons were stacked; policy allows ${policy.maxStackedPromotions}.`,
    );
  }

  for (const definition of definitions) {
    if (!definition.eligiblePlans.includes(account.plan)) {
      addReason(
        reasons,
        "hold",
        "plan_not_eligible",
        `${definition.coupon} is not eligible for the ${account.plan} plan.`,
      );
    }
    if (definition.requires.includes("verified_payment") && !verifiedPayment(account)) {
      addReason(reasons, "hold", "payment_not_verified", `${definition.coupon} requires a verified payment method.`);
    }
    if (definition.requires.includes("paid_plan") && account.lifecycle !== "active") {
      addReason(reasons, "hold", "requires_paid_plan", `${definition.coupon} can only be used by active paid accounts.`);
    }
    if (
      definition.requires.includes("active_consortium_roster") &&
      account.consortiumMembership?.status !== "active"
    ) {
      addReason(
        reasons,
        "hold",
        "consortium_roster_not_active",
        `${definition.coupon} requires an active consortium roster entry.`,
      );
    }
  }

  if (requestedDiscountPct > policy.maxCombinedDiscountPct) {
    addReason(
      reasons,
      "hold",
      "discount_cap_exceeded",
      `Requested discount ${requestedDiscountPct}% exceeds ${policy.maxCombinedDiscountPct}% policy cap.`,
    );
  }

  const approvedDiscountPct = reasons.length === 0 ? requestedDiscountPct : Math.min(requestedDiscountPct, policy.maxCombinedDiscountPct);
  const requestedDiscountCents = invoice ? centsForDiscount(invoice.subtotalCents, requestedDiscountPct) : 0;
  const approvedDiscountCents = invoice ? centsForDiscount(invoice.subtotalCents, approvedDiscountPct) : 0;
  const discountLeakagePreventedCents = reasons.length > 0 ? Math.max(0, requestedDiscountCents - approvedDiscountCents) : 0;

  return {
    reasons,
    requestedDiscountPct,
    approvedDiscountPct,
    requestedDiscountCents,
    approvedDiscountCents,
    discountLeakagePreventedCents,
  };
}

function validateTrialConversion(event, account, invoice, policy) {
  const promotionResult = validatePromotion(event, account, invoice, policy);
  const reasons = [...promotionResult.reasons];
  if (!verifiedPayment(account)) {
    addReason(reasons, "hold", "conversion_payment_missing", "Trial cannot convert until a verified payment method is present.");
  }
  return {...promotionResult, reasons};
}

function evaluatePromotionControls(input) {
  const policy = input.policy;
  const accounts = input.accounts;
  const invoices = new Map(input.invoices.map((invoice) => [invoice.id, invoice]));
  const context = buildPromotionContext(accounts);
  const sortedEvents = [...input.events].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const decisions = [];

  for (const event of sortedEvents) {
    const account = context.accountById.get(event.accountId);
    const invoice = event.invoiceId ? invoices.get(event.invoiceId) : undefined;
    const base = {
      eventId: event.id,
      eventType: event.type,
      accountId: event.accountId,
      accountName: account?.name ?? "Unknown account",
      invoiceId: event.invoiceId ?? null,
      timestamp: event.timestamp,
    };

    if (!account) {
      const reasons = [{severity: "reject", code: "unknown_account", message: "Event references an unknown account."}];
      decisions.push({...base, status: "rejected", reasons});
      continue;
    }

    if (event.type === "trial_started") {
      const reasons = validateTrialStart(event, account, policy, context);
      decisions.push({...base, status: severityStatus(reasons), reasons});
      rememberTrial(account, context);
      continue;
    }

    if (event.type === "promotion_applied") {
      const promotion = validatePromotion(event, account, invoice, policy);
      decisions.push({...base, status: severityStatus(promotion.reasons), ...promotion});
      continue;
    }

    if (event.type === "trial_conversion") {
      const conversion = validateTrialConversion(event, account, invoice, policy);
      decisions.push({...base, status: severityStatus(conversion.reasons), ...conversion});
      continue;
    }

    const reasons = [{severity: "review", code: "unknown_event_type", message: `Unhandled event type ${event.type}.`}];
    decisions.push({...base, status: "review", reasons});
  }

  const metrics = {
    totalEvents: decisions.length,
    approvedEvents: decisions.filter((decision) => decision.status === "approved").length,
    heldEvents: decisions.filter((decision) => decision.status === "hold").length,
    rejectedEvents: decisions.filter((decision) => decision.status === "rejected").length,
    reviewedEvents: decisions.filter((decision) => decision.status === "review").length,
    discountLeakagePreventedCents: decisions.reduce(
      (total, decision) => total + (decision.discountLeakagePreventedCents ?? 0),
      0,
    ),
    requestedDiscountCents: decisions.reduce((total, decision) => total + (decision.requestedDiscountCents ?? 0), 0),
    approvedDiscountCents: decisions.reduce((total, decision) => total + (decision.approvedDiscountCents ?? 0), 0),
  };

  const result = {
    generatedAt: "2026-05-21T12:00:00Z",
    control: "trial-promotion-abuse-guard",
    metrics,
    decisions,
  };
  result.digest = digestFor(result);
  return result;
}

function money(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

function buildMarkdownReport(result) {
  const lines = [
    "# Trial Promotion Abuse Guard",
    "",
    `Digest: \`${result.digest}\``,
    "",
    "## Summary",
    "",
    `- Events reviewed: ${result.metrics.totalEvents}`,
    `- Approved: ${result.metrics.approvedEvents}`,
    `- Held: ${result.metrics.heldEvents}`,
    `- Rejected: ${result.metrics.rejectedEvents}`,
    `- Discount leakage prevented: ${money(result.metrics.discountLeakagePreventedCents)}`,
    "",
    "## Decisions",
    "",
    "| Event | Account | Status | Reason codes |",
    "| --- | --- | --- | --- |",
  ];

  for (const decision of result.decisions) {
    const codes = decision.reasons.length ? decision.reasons.map((reason) => reason.code).join(", ") : "none";
    lines.push(`| ${decision.eventId} | ${decision.accountName} | ${decision.status} | ${codes} |`);
  }

  lines.push("", "## Finance Action");
  lines.push(
    "Hold rejected or held trials/promotions before invoice release, route consortium exceptions to finance review, and only let approved discount cents reach revenue reporting.",
  );
  return `${lines.join("\n")}\n`;
}

function buildSummarySvg(result) {
  const escapedDigest = result.digest.slice(0, 16);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#111827"/>
  <rect x="44" y="44" width="872" height="452" rx="18" fill="#f8fafc"/>
  <text x="80" y="108" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#111827">Trial Promotion Abuse Guard</text>
  <text x="80" y="152" font-family="Arial, sans-serif" font-size="18" fill="#475569">Revenue control packet ${escapedDigest}</text>
  <g font-family="Arial, sans-serif" font-size="24" font-weight="700">
    <text x="90" y="230" fill="#15803d">Approved: ${result.metrics.approvedEvents}</text>
    <text x="90" y="282" fill="#b45309">Held: ${result.metrics.heldEvents}</text>
    <text x="90" y="334" fill="#b91c1c">Rejected: ${result.metrics.rejectedEvents}</text>
    <text x="90" y="386" fill="#0f172a">Leakage prevented: ${money(result.metrics.discountLeakagePreventedCents)}</text>
  </g>
  <rect x="570" y="190" width="260" height="180" rx="14" fill="#dbeafe"/>
  <text x="602" y="246" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#1d4ed8">Checks</text>
  <text x="602" y="286" font-family="Arial, sans-serif" font-size="17" fill="#1e3a8a">Trial reuse</text>
  <text x="602" y="318" font-family="Arial, sans-serif" font-size="17" fill="#1e3a8a">Coupon stacking</text>
  <text x="602" y="350" font-family="Arial, sans-serif" font-size="17" fill="#1e3a8a">Consortium eligibility</text>
</svg>`;
}

module.exports = {
  buildMarkdownReport,
  buildSummarySvg,
  evaluatePromotionControls,
  money,
};
