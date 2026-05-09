import type { Currency, Money } from "../types.js"

export function money(cents: number, currency: Currency = "USD"): Money {
  return { currency, cents: Math.max(0, Math.round(cents)) }
}

export function formatMoney(value: Money): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: value.currency
  }).format(value.cents / 100)
}

export function splitMoneyByPercent(total: Money, percent: number): Money {
  return money(total.cents * (percent / 100), total.currency)
}
