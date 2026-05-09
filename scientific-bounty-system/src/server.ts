import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { URL } from "node:url"
import { bountyService } from "./index.js"
import { formatMoney } from "./lib/money.js"

const PORT = Number(process.env.PORT ?? 3001)

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
  const raw = Buffer.concat(chunks).toString("utf8")
  return raw ? JSON.parse(raw) as T : {} as T
}

function dashboardHtml() {
  const rows = bountyService.sponsorDashboard()
  const totalEscrow = bountyService.listChallenges().reduce((sum, challenge) => sum + challenge.escrowed.cents, 0)
  const totalSubmissions = bountyService.listSubmissions().length
  const challengeCards = rows.map((row) => `
    <article class="card">
      <div>
        <p class="eyebrow">${row.domain} / ${row.phase}</p>
        <h2>${row.title}</h2>
        <p>${row.sponsor}</p>
      </div>
      <div class="metrics">
        <section><span>Prize</span><strong>${formatMoney(row.prize)}</strong></section>
        <section><span>Submissions</span><strong>${row.submissions}</strong></section>
        <section><span>Top score</span><strong>${row.topScore}</strong></section>
        <section><span>Winner</span><strong>${row.winningSubmissionId ?? "pending"}</strong></section>
      </div>
      <button data-arbitrate="${row.challengeId}">Run arbitration</button>
      <pre id="result-${row.challengeId}"></pre>
    </article>
  `).join("")

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>SCIBASE Scientific Bounty System</title>
      <style>
        :root {
          --ink: #162033;
          --muted: #60708a;
          --line: #dbe3ef;
          --surface: #f6f8fb;
          --panel: #ffffff;
          --accent: #0f766e;
          --accent-2: #334155;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: var(--surface);
          color: var(--ink);
        }
        header {
          padding: 34px clamp(18px, 4vw, 58px);
          background: #ffffff;
          border-bottom: 1px solid var(--line);
        }
        h1, h2 { margin: 0; letter-spacing: 0; }
        h1 { font-size: clamp(30px, 4vw, 50px); line-height: 1.05; }
        h2 { font-size: 21px; }
        p { color: var(--muted); line-height: 1.55; }
        main {
          width: min(1160px, calc(100% - 32px));
          margin: 28px auto 56px;
          display: grid;
          gap: 20px;
        }
        .metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 14px;
        }
        .metrics section, .card, .panel {
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--panel);
        }
        .metrics section { padding: 16px; }
        .metrics span, .eyebrow {
          display: block;
          color: var(--muted);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
        }
        .metrics strong {
          display: block;
          margin-top: 8px;
          font-size: 24px;
        }
        .card {
          padding: 20px;
          display: grid;
          gap: 16px;
        }
        button {
          width: max-content;
          min-height: 38px;
          padding: 0 14px;
          border: 0;
          border-radius: 6px;
          background: var(--accent);
          color: white;
          font-weight: 800;
          cursor: pointer;
        }
        pre {
          margin: 0;
          min-height: 26px;
          max-height: 280px;
          overflow: auto;
          padding: 12px;
          border-radius: 6px;
          background: #0b1220;
          color: #e6edf7;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <header>
        <p class="eyebrow">SCIBASE.AI issue #18</p>
        <h1>Scientific Bounty System</h1>
        <p>Challenge posting, secure submissions, arbitration, escrowed prize payouts, and IP release logic in one runnable module.</p>
      </header>
      <main>
        <section class="metrics">
          <section><span>Open challenges</span><strong>${rows.length}</strong></section>
          <section><span>Escrowed prizes</span><strong>${formatMoney({ currency: "USD", cents: totalEscrow })}</strong></section>
          <section><span>Submissions</span><strong>${totalSubmissions}</strong></section>
          <section><span>Ready winners</span><strong>${rows.filter((row) => row.winningSubmissionId).length}</strong></section>
        </section>
        ${challengeCards}
      </main>
      <script>
        document.querySelectorAll("[data-arbitrate]").forEach((button) => {
          button.addEventListener("click", async () => {
            const challengeId = button.getAttribute("data-arbitrate")
            const arbitration = await fetch("/api/arbitration/" + challengeId).then((response) => response.json())
            const payout = arbitration.winningSubmissionId
              ? await fetch("/api/payouts", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ challengeId })
                }).then((response) => response.json())
              : null
            document.getElementById("result-" + challengeId).textContent = JSON.stringify({ arbitration, payout }, null, 2)
          })
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
    if (request.method === "GET" && url.pathname === "/api/challenges") {
      sendJson(response, 200, bountyService.listChallenges())
      return
    }
    if (request.method === "GET" && url.pathname === "/api/submissions") {
      sendJson(response, 200, bountyService.listSubmissions(url.searchParams.get("challengeId") ?? undefined))
      return
    }
    if (request.method === "GET" && url.pathname === "/api/dashboard") {
      sendJson(response, 200, bountyService.sponsorDashboard())
      return
    }
    if (request.method === "GET" && url.pathname.startsWith("/api/arbitration/")) {
      sendJson(response, 200, bountyService.arbitrate(url.pathname.split("/").at(-1) ?? ""))
      return
    }
    if (request.method === "POST" && url.pathname === "/api/payouts") {
      const body = await readJson<{ challengeId: string; submissionId?: string }>(request)
      sendJson(response, 200, bountyService.buildPayout(body.challengeId, body.submissionId))
      return
    }
    if (request.method === "POST" && url.pathname === "/api/challenges") {
      const body = await readJson<Parameters<typeof bountyService.createChallenge>[0]>(request)
      sendJson(response, 201, bountyService.createChallenge(body))
      return
    }
    sendJson(response, 404, { error: "Not found" })
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : "Unknown error" })
  }
}

if (process.env.NODE_ENV !== "test") {
  createServer(route).listen(PORT, () => {
    console.log(`SCIBASE scientific bounty system demo running at http://localhost:${PORT}`)
  })
}

export { route }
