import http from "node:http";
import {
  buildArbitrationCase,
  buildBountyDashboard,
  buildChallengeContract,
  buildSubmissionPackage,
  resolveIpTerms,
  routePayouts
} from "./bounty-system.js";
import { sampleChallenge, sampleSubmission } from "./sample-data.js";

const port = Number.parseInt(process.env.PORT ?? "4318", 10);

function sendJson(response, payload) {
  response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function renderPage() {
  const dashboard = buildBountyDashboard(sampleChallenge, sampleSubmission);
  const payments = dashboard.payoutRouting.payments
    .map((payment) => `<li>${payment.recipientType}: ${payment.recipientId} - $${payment.amountUsd} (${payment.reason})</li>`)
    .join("");
  const checklist = dashboard.arbitration.checklist
    .map((item) => `<li>${item.status === "passed" ? "PASS" : "MISSING"} ${item.item}</li>`)
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Scientific Bounty Trust System</title>
  <style>
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #f6f8fb; color: #17202a; }
    main { max-width: 1080px; margin: 0 auto; padding: 40px 24px; }
    h1 { font-size: 42px; margin: 0 0 12px; letter-spacing: 0; }
    p { color: #526173; font-size: 18px; line-height: 1.5; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin: 28px 0; }
    .panel { background: white; border: 1px solid #dde4ee; border-radius: 8px; padding: 18px; }
    strong { display: block; font-size: 30px; margin-top: 8px; }
    li { margin-bottom: 10px; }
    code { background: #e9eef5; padding: 2px 6px; border-radius: 5px; }
    @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } h1 { font-size: 32px; } }
  </style>
</head>
<body>
  <main>
    <p>SCIBASE.AI marketplace milestone</p>
    <h1>Scientific Bounty Trust System</h1>
    <p>${sampleChallenge.title}. Endpoints: <code>/api/dashboard</code>, <code>/api/challenge</code>, <code>/api/submission</code>, <code>/api/arbitration</code>, <code>/api/payouts</code>.</p>
    <section class="grid">
      <div class="panel">Trust status<strong>${dashboard.trustStatus}</strong></div>
      <div class="panel">Final score<strong>${dashboard.arbitration.score.finalScore}</strong></div>
      <div class="panel">Routed payout<strong>$${dashboard.payoutRouting.totalRoutedUsd}</strong></div>
    </section>
    <section class="grid">
      <div class="panel"><h2>Checklist</h2><ul>${checklist}</ul></div>
      <div class="panel"><h2>Payout Routing</h2><ul>${payments}</ul></div>
      <div class="panel"><h2>IP Terms</h2><p>${dashboard.ipTerms.transferCondition}</p></div>
    </section>
  </main>
</body>
</html>`;
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const arbitration = buildArbitrationCase(sampleChallenge, sampleSubmission);
  if (url.pathname === "/api/dashboard") return sendJson(response, buildBountyDashboard(sampleChallenge, sampleSubmission));
  if (url.pathname === "/api/challenge") return sendJson(response, buildChallengeContract(sampleChallenge));
  if (url.pathname === "/api/submission") return sendJson(response, buildSubmissionPackage(sampleChallenge, sampleSubmission));
  if (url.pathname === "/api/arbitration") return sendJson(response, arbitration);
  if (url.pathname === "/api/payouts") {
    return sendJson(response, {
      payouts: routePayouts(sampleChallenge, sampleSubmission, arbitration),
      ipTerms: resolveIpTerms(sampleChallenge, sampleSubmission, arbitration)
    });
  }
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(renderPage());
});

server.listen(port, () => {
  console.log(`Scientific Bounty Trust System running at http://localhost:${port}`);
});
