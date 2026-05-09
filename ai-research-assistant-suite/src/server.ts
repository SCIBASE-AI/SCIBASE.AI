import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { URL } from "node:url"
import { assistantService } from "./index.js"

const PORT = Number(process.env.PORT ?? 3002)

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,OPTIONS",
    "access-control-allow-headers": "content-type"
  })
  response.end(JSON.stringify(body, null, 2))
}

function sendHtml(response: ServerResponse, html: string) {
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" })
  response.end(html)
}

function renderDashboard() {
  const projectId = "project_organoid_response"
  const dashboard = assistantService.projectDashboard(projectId)
  const findingRows = dashboard.review.findings.map((finding) => `
    <tr>
      <td>${finding.severity}</td>
      <td>${finding.category}</td>
      <td>${finding.message}</td>
      <td>${finding.recommendation}</td>
    </tr>
  `).join("")
  const checkRows = dashboard.reproducibility.checks.map((check) => `
    <tr>
      <td>${check.status}</td>
      <td>${check.label}</td>
      <td>${check.evidence}</td>
    </tr>
  `).join("")
  const gapRows = dashboard.gaps.map((gap) => `
    <tr>
      <td>${gap.noveltyScore}</td>
      <td>${gap.title}</td>
      <td>${gap.rationale}</td>
    </tr>
  `).join("")

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>SCIBASE AI Research Assistant Suite</title>
      <style>
        :root {
          --ink: #172033;
          --muted: #60708a;
          --line: #d9e2ef;
          --surface: #f7f9fc;
          --panel: #ffffff;
          --accent: #0f766e;
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
          background: #fff;
          border-bottom: 1px solid var(--line);
        }
        h1, h2 { margin: 0; letter-spacing: 0; }
        h1 { font-size: clamp(30px, 4vw, 50px); line-height: 1.05; }
        h2 { font-size: 20px; }
        p { color: var(--muted); line-height: 1.55; }
        main {
          width: min(1180px, calc(100% - 32px));
          margin: 28px auto 56px;
          display: grid;
          gap: 20px;
        }
        .metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 14px;
        }
        .metric, .panel {
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 8px;
        }
        .metric { padding: 16px; }
        .metric span, .eyebrow {
          display: block;
          color: var(--muted);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
        }
        .metric strong {
          display: block;
          margin-top: 8px;
          font-size: 26px;
        }
        .panel { padding: 20px; overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        th, td {
          padding: 12px 10px;
          border-bottom: 1px solid var(--line);
          text-align: left;
          vertical-align: top;
        }
        th {
          color: var(--muted);
          font-size: 12px;
          letter-spacing: .08em;
          text-transform: uppercase;
        }
        code {
          display: block;
          padding: 12px;
          border-radius: 6px;
          background: #0b1220;
          color: #e6edf7;
          white-space: pre-wrap;
        }
      </style>
    </head>
    <body>
      <header>
        <p class="eyebrow">SCIBASE.AI issue #16</p>
        <h1>AI Research Assistant Suite</h1>
        <p>Automated peer review reports, reproducibility confidence checks, and research gap discovery for active scientific projects.</p>
      </header>
      <main>
        <section class="panel">
          <p class="eyebrow">${dashboard.project.domain}</p>
          <h2>${dashboard.project.title}</h2>
          <p>${dashboard.project.keywords.join(" / ")}</p>
        </section>
        <section class="metrics">
          <section class="metric"><span>Review score</span><strong>${dashboard.review.score}</strong></section>
          <section class="metric"><span>Reproducibility</span><strong>${dashboard.reproducibility.confidenceScore}</strong></section>
          <section class="metric"><span>Top gap novelty</span><strong>${dashboard.gaps[0]?.noveltyScore ?? 0}</strong></section>
          <section class="metric"><span>Readiness</span><strong>${dashboard.readinessScore}</strong></section>
        </section>
        <section class="panel">
          <h2>Auto peer review</h2>
          <table><thead><tr><th>Severity</th><th>Category</th><th>Finding</th><th>Recommendation</th></tr></thead><tbody>${findingRows}</tbody></table>
        </section>
        <section class="panel">
          <h2>Reproducibility checker</h2>
          <table><thead><tr><th>Status</th><th>Check</th><th>Evidence</th></tr></thead><tbody>${checkRows}</tbody></table>
          <code>${dashboard.reproducibility.recommendedCommand ?? "No command available"}</code>
        </section>
        <section class="panel">
          <h2>Research gap finder</h2>
          <table><thead><tr><th>Novelty</th><th>Gap</th><th>Rationale</th></tr></thead><tbody>${gapRows}</tbody></table>
        </section>
      </main>
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
      sendHtml(response, renderDashboard())
      return
    }
    if (request.method === "GET" && url.pathname === "/api/projects") {
      sendJson(response, 200, assistantService.listProjects())
      return
    }
    if (request.method === "GET" && url.pathname.startsWith("/api/review/")) {
      sendJson(response, 200, assistantService.review(url.pathname.split("/").at(-1) ?? ""))
      return
    }
    if (request.method === "GET" && url.pathname.startsWith("/api/reproducibility/")) {
      sendJson(response, 200, assistantService.reproduce(url.pathname.split("/").at(-1) ?? ""))
      return
    }
    if (request.method === "GET" && url.pathname.startsWith("/api/gaps/")) {
      sendJson(response, 200, assistantService.gaps(url.pathname.split("/").at(-1) ?? ""))
      return
    }
    if (request.method === "GET" && url.pathname.startsWith("/api/dashboard/")) {
      sendJson(response, 200, assistantService.projectDashboard(url.pathname.split("/").at(-1) ?? ""))
      return
    }
    sendJson(response, 404, { error: "Not found" })
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : "Unknown error" })
  }
}

if (process.env.NODE_ENV !== "test") {
  createServer(route).listen(PORT, () => {
    console.log(`SCIBASE AI research assistant demo running at http://localhost:${PORT}`)
  })
}

export { route }
