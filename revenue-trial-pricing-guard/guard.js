"use strict";

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return date;
}

function centsToDollars(cents) {
  return Number((cents / 100).toFixed(2));
}

function addFinding(findings, severity, code, message, atRiskCents = 0) {
  findings.push({ severity, code, message, atRiskCents });
}

function getPlan(plans, planId) {
  const plan = plans[planId];
  if (!plan) {
    throw new Error(`Unknown plan: ${planId}`);
  }
  return plan;
}

function getCoupon(coupons, couponId) {
  const coupon = coupons[couponId];
  if (!coupon) {
    throw new Error(`Unknown coupon: ${couponId}`);
  }
  return coupon;
}

function accountBasePriceCents(plans, account) {
  const plan = getPlan(plans, account.plan);
  const seatCount = Math.max(1, account.seats || 1);
  const monthlyBase = plan.monthlyCents * seatCount;
  if (account.billingCycle === "annual") {
    return monthlyBase * 12;
  }
  return monthlyBase;
}

function couponDiscountCents(baseCents, coupon) {
  if (coupon.type === "percent") {
    return Math.round(baseCents * coupon.percent);
  }
  if (coupon.type === "fixed") {
    return Math.min(baseCents, coupon.amountCents);
  }
  throw new Error(`Unsupported coupon type: ${coupon.type}`);
}

function isAfter(date, compareTo) {
  return parseDate(date).getTime() > parseDate(compareTo).getTime();
}

function trialAgeDays(account, invoiceDate) {
  if (!account.trialStartedAt) return 0;
  return Math.floor((parseDate(invoiceDate).getTime() - parseDate(account.trialStartedAt).getTime()) / DAY_MS);
}

function qualifiesForConsortium(account, consortium) {
  if (!consortium) return false;
  const domainOk = consortium.allowedEmailDomains.includes(account.emailDomain);
  const seatsOk = (account.seats || 0) >= consortium.minimumSeats;
  const institutionOk = !consortium.allowedInstitutionIds || consortium.allowedInstitutionIds.includes(account.institutionId);
  return domainOk && seatsOk && institutionOk;
}

function evaluateAccount(account, config) {
  const findings = [];
  const baseCents = accountBasePriceCents(config.plans, account);
  const discountEvents = [];
  const appliedCouponIds = account.coupons || [];
  let discountCents = 0;

  if (account.trialActive) {
    const age = trialAgeDays(account, config.invoiceDate);
    if (account.priorTrials > 0) {
      addFinding(
        findings,
        "block",
        "trial_reuse",
        "Free trial was reused after a prior trial on the same billing identity.",
        baseCents
      );
    }
    if (age > config.maxTrialDays) {
      addFinding(
        findings,
        "block",
        "trial_overrun",
        `Trial age is ${age} days, above the ${config.maxTrialDays}-day policy.`,
        baseCents
      );
    }
    if (!account.conversionEvidence) {
      addFinding(
        findings,
        "review",
        "missing_conversion_evidence",
        "Trial account has no conversion evidence before invoice release.",
        Math.round(baseCents * 0.25)
      );
    }
  }

  for (const couponId of appliedCouponIds) {
    const coupon = getCoupon(config.coupons, couponId);
    if (coupon.expiresAt && isAfter(config.invoiceDate, coupon.expiresAt)) {
      addFinding(
        findings,
        "block",
        "expired_coupon",
        `Coupon ${couponId} expired on ${coupon.expiresAt}.`,
        couponDiscountCents(baseCents, coupon)
      );
    }
    if (coupon.allowedPlanIds && !coupon.allowedPlanIds.includes(account.plan)) {
      addFinding(
        findings,
        "block",
        "coupon_plan_mismatch",
        `Coupon ${couponId} is not valid for plan ${account.plan}.`,
        couponDiscountCents(baseCents, coupon)
      );
    }
    if (coupon.consortiumId) {
      const consortium = config.consortia[coupon.consortiumId];
      if (!qualifiesForConsortium(account, consortium)) {
        addFinding(
          findings,
          "block",
          "consortium_ineligible",
          `Coupon ${couponId} requires consortium eligibility that this account does not satisfy.`,
          couponDiscountCents(baseCents, coupon)
        );
      }
    }
    if (coupon.requiresConversionEvidence && !account.conversionEvidence) {
      addFinding(
        findings,
        "review",
        "coupon_missing_conversion_evidence",
        `Coupon ${couponId} requires conversion evidence before billing.`,
        Math.round(couponDiscountCents(baseCents, coupon) * 0.5)
      );
    }
    discountCents += couponDiscountCents(baseCents, coupon);
    discountEvents.push({ type: "coupon", id: couponId, amountCents: couponDiscountCents(baseCents, coupon) });
  }

  const nonStackableCoupons = appliedCouponIds
    .map((couponId) => getCoupon(config.coupons, couponId))
    .filter((coupon) => coupon.stackable === false);

  if (appliedCouponIds.length > 1 && nonStackableCoupons.length > 0) {
    addFinding(
      findings,
      "block",
      "non_stackable_coupon_combo",
      "One or more non-stackable coupons were combined on the same invoice.",
      Math.round(discountCents * 0.75)
    );
  }

  if (account.billingCycle === "annual" && account.annualDiscountPercent) {
    const annualDiscount = Math.round(baseCents * account.annualDiscountPercent);
    discountCents += annualDiscount;
    discountEvents.push({ type: "annual", id: "annual_cycle", amountCents: annualDiscount });
  }

  if (account.volumeDiscountPercent) {
    const volumeDiscount = Math.round(baseCents * account.volumeDiscountPercent);
    discountCents += volumeDiscount;
    discountEvents.push({ type: "volume", id: "seat_volume", amountCents: volumeDiscount });
  }

  const effectiveDiscountPercent = baseCents === 0 ? 0 : discountCents / baseCents;
  if (effectiveDiscountPercent > config.maxDiscountPercent) {
    addFinding(
      findings,
      "review",
      "discount_cap_exceeded",
      `Effective discount ${Math.round(effectiveDiscountPercent * 100)}% exceeds cap ${Math.round(config.maxDiscountPercent * 100)}%.`,
      discountCents - Math.round(baseCents * config.maxDiscountPercent)
    );
  }

  const blockCount = findings.filter((finding) => finding.severity === "block").length;
  const reviewCount = findings.filter((finding) => finding.severity === "review").length;
  const action = blockCount > 0 ? "HOLD_INVOICE" : reviewCount > 0 ? "REVIEW_BEFORE_RELEASE" : "RELEASE_INVOICE";
  const atRiskCents = findings.reduce((total, finding) => total + finding.atRiskCents, 0);
  const netInvoiceCents = Math.max(0, baseCents - Math.min(discountCents, baseCents));

  return {
    accountId: account.id,
    accountName: account.name,
    plan: account.plan,
    baseCents,
    discountCents: Math.min(discountCents, baseCents),
    netInvoiceCents,
    effectiveDiscountPercent: Number(effectiveDiscountPercent.toFixed(4)),
    action,
    findings,
    discountEvents,
    atRiskCents
  };
}

function evaluatePortfolio(config) {
  const accounts = config.accounts.map((account) => evaluateAccount(account, config));
  const summary = {
    invoiceDate: config.invoiceDate,
    accountCount: accounts.length,
    releaseCount: accounts.filter((account) => account.action === "RELEASE_INVOICE").length,
    reviewCount: accounts.filter((account) => account.action === "REVIEW_BEFORE_RELEASE").length,
    holdCount: accounts.filter((account) => account.action === "HOLD_INVOICE").length,
    totalAtRiskCents: accounts.reduce((total, account) => total + account.atRiskCents, 0),
    totalNetInvoiceCents: accounts.reduce((total, account) => total + account.netInvoiceCents, 0)
  };

  return {
    summary: {
      ...summary,
      totalAtRiskDollars: centsToDollars(summary.totalAtRiskCents),
      totalNetInvoiceDollars: centsToDollars(summary.totalNetInvoiceCents)
    },
    accounts
  };
}

module.exports = {
  evaluateAccount,
  evaluatePortfolio,
  centsToDollars
};
