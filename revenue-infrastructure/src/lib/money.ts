import type { Currency, Money } from "../types.js"

export const USD: Currency = "USD"

export function money(cents: number, currency: Currency = USD): Money {
  return { currency, cents: Math.round(cents) }
}

export function clampCents(value: number): number {
  return Math.max(0, Math.round(value))
}

export function applyPercentDiscount(cents: number, percent: number): number {
  return clampCents(cents * (percent / 100))
}

export function formatMoney(cents: number, currency: Currency = USD): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2
  }).format(cents / 100)
}

export function prorateCents(monthlyCents: number, periodMonths: number): number {
  return clampCents(monthlyCents * periodMonths)
}
