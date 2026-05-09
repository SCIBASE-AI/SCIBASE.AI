import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { URL } from "node:url"
import { revenueService } from "./index.js"
import { formatMoney } from "./lib/money.js"
import type { RevenueSummary } from "./types.js"

const PORT = Number(process.env.PORT ?? 3000)

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type"
  })
  response.end(JSON.stringify(body, null, 2))
}

function sendHtml(response: ServerResponse, html: string) {
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" })
  response.end(html)
}

async function readJson<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const body = Buffer.concat(chunks).toString("utf8")
  return body ? JSON.parse(body) as T : {} as T
}

function renderMetric(label: string, value: string) {
  return `<section class="metric"><span>${label}</span><strong>${value}</strong></section>`
}

function renderAccountCard(summary: RevenueSummary) {
  const account = revenueService.listAccounts().find((candidate) => candidate.id === summary.accountId)
  return `
    <article class="card">
      <div>
        <p class="eyebrow">${account?.kind ?? "account"}</p>
        <h2>${account?.name ?? summary.accountId}</h2>
      </div>
      <div class="grid compact">
        ${renderMetric("Subscription MRR", formatMoney(summary.recurringRevenueCents))}
        ${renderMetric("Usage this month", formatMoney(summary.usageRevenueCents))}
        ${renderMetric("Licensing MRR", formatMoney(summary.licensingRevenueCents))}
        ${renderMetric("Projected MRR", formatMoney(summary.projectedMonthlyRevenueCents))}
      </div>
      <p class="streams">${summary.activeStreams.join(" / ")}</p>
      <button data-account="${summary.accountId}">Generate invoice</button>
      <pre id="invoice-${summary.accountId}"></pre>
    </article>
  `
}

function dashboardHtml() {
  const platform = revenueService.platformRevenueSummary()
  const planRows = revenueService.listPlans().map((plan) => `
    <tr>
      <td>${plan.name}</td>
      <td>${plan.kind}</td>
      <td>${formatMoney(plan.monthlyBaseCents)}</td>
      <td>${plan.includedSeats}</td>
      <td>${plan.trialDays} days</td>
      <td>${plan.features.filter((feature) => feature.included).map((feature) => feature.label).join(", ")}</td>
    </tr>
  `).join("")

  return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>SCIBASE Revenue Infrastructure</title>
        <style>
          :root {
            color-scheme: light;
            --ink: #14213d;
            --muted: #5f6f89;
            --line: #d9e2ef;
            --surface: #f8fafc;
            --panel: #ffffff;
            --accent: #0f766e;
            --accent-2: #b45309;
            --danger: #b91c1c;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: var(--surface);
            color: var(--ink);
          }
          header {
            padding: 32px clamp(18px, 4vw, 56px) 20px;
            border-bottom: 1px solid var(--line);
            background: #ffffff;
          }
          h1, h2 { margin: 0; letter-spacing: 0; }
          h1 { font-size: clamp(28px, 4vw, 48px); line-height: 1.05; }
          h2 { font-size: 20px; }
          p { color: var(--muted); line-height: 1.55; }
          main {
            width: min(1180px, calc(100% - 32px));
            margin: 28px auto 56px;
            display: grid;
            gap: 22px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
            gap: 14px;
          }
          .compact { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
          .metric, .card, .table-wrap, .api-panel {
            background: var(--panel);
            border: 1px solid var(--line);
            border-radius: 8px;
          }
          .metric { padding: 16px; }
          .metric span, .eyebrow {
            display: block;
            color: var(--muted);
            font-size: 12px;
            font-weight: 700;
            letter-spacing: .08em;
            text-transform: uppercase;
          }
          .metric strong {
            display: block;
            margin-top: 8px;
            font-size: 24px;
          }
          .card {
            padding: 20px;
            display: grid;
            gap: 16px;
          }
          .streams { margin: 0; color: var(--accent); font-weight: 700; }
          button {
            width: max-content;
            min-height: 38px;
            padding: 0 14px;
            border: 0;
            border-radius: 6px;
            background: var(--accent);
            color: white;
            font-weight: 700;
            cursor: pointer;
          }
          button.secondary { background: var(--accent-2); }
          table {
            width: 100%;
            border-collapse: collapse;
            background: white;
          }
          th, td {
            padding: 13px 14px;
            border-bottom: 1px solid var(--line);
            text-align: left;
            vertical-align: top;
          }
          th {
            color: var(--muted);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: .08em;
          }
          .table-wrap { overflow-x: auto; }
          .api-panel {
            padding: 20px;
            display: grid;
            gap: 12px;
          }
          pre {
            margin: 0;
            min-height: 0;
            max-height: 260px;
            overflow: auto;
            padding: 12px;
            border-radius: 6px;
            background: #0b1220;
            color: #e5eefb;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <header>
          <p class="eyebrow">SCIBASE.AI issue #20</p>
          <h1>Revenue Infrastructure</h1>
          <p>Subscription billing, AI compute metering, top-ups, institutional invoicing, and privacy-safe licensing analytics in one runnable module.</p>
        </header>
        <main>
          <section class="grid">
            ${renderMetric("Subscription MRR", formatMoney(platform.subscriptionMrr))}
            ${renderMetric("Usage MRR", formatMoney(platform.usageMrr))}
            ${renderMetric("Licensing ARR", formatMoney(platform.licensingArr))}
            ${renderMetric("Projected MRR", formatMoney(platform.projectedMrr))}
          </section>

          <section class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Type</th>
                  <th>Base</th>
                  <th>Seats</th>
                  <th>Trial</th>
                  <th>Included features</th>
                </tr>
              </thead>
              <tbody>${planRows}</tbody>
            </table>
          </section>

          ${platform.accounts.map(renderAccountCard).join("")}

          <section class="api-panel">
            <h2>Licensing export</h2>
            <p>Exports only aggregated metadata and excludes events marked as private content.</p>
            <button class="secondary" id="export-licensing">Preview export</button>
            <pre id="licensing-output"></pre>
          </section>
        </main>
        <script>
          const period = {
            periodStart: "2026-05-01T00:00:00.000Z",
            periodEnd: "2026-06-01T00:00:00.000Z"
          }
          document.querySelectorAll("[data-account]").forEach((button) => {
            button.addEventListener("click", async () => {
              const accountId = button.getAttribute("data-account")
              const response = await fetch("/api/invoices/generate", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ accountId, ...period })
              })
              const invoice = await response.json()
              document.getElementById("invoice-" + accountId).textContent = JSON.stringify(invoice, null, 2)
            })
          })
          document.getElementById("export-licensing").addEventListener("click", async () => {
            const response = await fetch("/api/licensing/export?contractId=lic_eu_001")
            const exportPayload = await response.json()
            document.getElementById("licensing-output").textContent = JSON.stringify(exportPayload, null, 2)
          })
        </script>
      </body>
    </html>`
}

async function route(request: IncomingMessage, response: ServerResponse) {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {})
    return
  }

  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`)

  try {
    if (request.method === "GET" && url.pathname === "/") {
      sendHtml(response, dashboardHtml())
      return
    }

    if (request.method === "GET" && url.pathname === "/api/plans") {
      sendJson(response, 200, revenueService.listPlans())
      return
    }

    if (request.method === "GET" && url.pathname === "/api/accounts") {
      sendJson(response, 200, revenueService.listAccounts())
      return
    }

    if (request.method === "GET" && url.pathname === "/api/analytics/revenue") {
      sendJson(response, 200, revenueService.platformRevenueSummary())
      return
    }

    if (request.method === "POST" && url.pathname === "/api/invoices/generate") {
      const body = await readJson<{ accountId: string; periodStart: string; periodEnd: string }>(request)
      sendJson(response, 200, revenueService.generateInvoice(body))
      return
    }

    if (request.method === "POST" && url.pathname === "/api/usage-events") {
      const body = await readJson<Parameters<typeof revenueService.recordUsage>[0]>(request)
      sendJson(response, 201, revenueService.recordUsage(body))
      return
    }

    if (request.method === "POST" && url.pathname === "/api/top-ups") {
      const body = await readJson<Parameters<typeof revenueService.createTopUp>[0]>(request)
      sendJson(response, 201, revenueService.createTopUp(body))
      return
    }

    if (request.method === "POST" && url.pathname === "/api/entitlements/check") {
      const body = await readJson<Parameters<typeof revenueService.checkEntitlement>[0]>(request)
      sendJson(response, 200, revenueService.checkEntitlement(body))
      return
    }

    if (request.method === "GET" && url.pathname === "/api/licensing/contracts") {
      sendJson(response, 200, revenueService.listLicensingContracts(url.searchParams.get("accountId") ?? undefined))
      return
    }

    if (request.method === "GET" && url.pathname === "/api/licensing/export") {
      sendJson(response, 200, revenueService.exportLicensingContract(url.searchParams.get("contractId") ?? "lic_eu_001"))
      return
    }

    sendJson(response, 404, { error: "Not found" })
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

if (process.env.NODE_ENV !== "test") {
  createServer(route).listen(PORT, () => {
    console.log(`SCIBASE revenue infrastructure demo running at http://localhost:${PORT}`)
  })
}

export { route }
