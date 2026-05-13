import http from "node:http";
import {
  buildAnalyticsLicenseExport,
  buildEntitlements,
  buildInvoice,
  buildPlanCatalog,
  buildRevenueReport,
  meterComputeUsage,
  priceSubscription
} from "./revenue.js";
import { analyticsDataset, customer, plans, topUps, usageEvents } from "./sample-data.js";

const port = Number.parseInt(process.env.PORT ?? "4326", 10);

function json(response, payload) {
  response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function page() {
  const report = buildRevenueReport({ planList: plans, customer, usageEvents, topUps, analyticsLicense: analyticsDataset });
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Revenue Operations Ledger</title>
  <style>
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #f7f8fb; color: #18202a; }
    main { max-width: 1060px; margin: 0 auto; padding: 40px 24px; }
    h1 { font-size: 42px; margin: 0 0 12px; letter-spacing: 0; }
    p { color: #536172; font-size: 18px; line-height: 1.5; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin: 28px 0; }
    .panel { background: white; border: 1px solid #dfe4ec; border-radius: 8px; padding: 18px; }
    strong { display: block; font-size: 30px; margin-top: 8px; }
    code { background: #edf1f6; padding: 2px 6px; border-radius: 5px; }
    @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } h1 { font-size: 32px; } }
  </style>
</head>
<body>
  <main>
    <p>SCIBASE.AI revenue milestone</p>
    <h1>Revenue Operations Ledger</h1>
    <p>${customer.name}. Endpoints: <code>/api/plans</code>, <code>/api/subscription</code>, <code>/api/usage</code>, <code>/api/invoice</code>, <code>/api/licensing</code>, <code>/api/report</code>.</p>
    <section class="grid">
      <div class="panel">Recurring<strong>$${report.health.recurringUsd}</strong></div>
      <div class="panel">Usage<strong>$${report.health.usageUsd}</strong></div>
      <div class="panel">Licensing<strong>$${report.health.licensingUsd}</strong></div>
      <div class="panel">Invoice<strong>$${report.health.totalInvoiceUsd}</strong></div>
    </section>
  </main>
</body>
</html>`;
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  if (url.pathname === "/api/plans") return json(response, buildPlanCatalog(plans));
  if (url.pathname === "/api/subscription") return json(response, priceSubscription(plans, customer));
  if (url.pathname === "/api/usage") return json(response, meterComputeUsage(usageEvents));
  if (url.pathname === "/api/entitlements") return json(response, buildEntitlements(plans, customer, topUps));
  if (url.pathname === "/api/invoice") {
    return json(response, buildInvoice({ id: "inv-2026-05", planList: plans, customer, usageEvents, topUps, analyticsLicense: analyticsDataset }));
  }
  if (url.pathname === "/api/licensing") return json(response, buildAnalyticsLicenseExport(analyticsDataset));
  if (url.pathname === "/api/report") return json(response, buildRevenueReport({ planList: plans, customer, usageEvents, topUps, analyticsLicense: analyticsDataset }));
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(page());
});

server.listen(port, () => {
  console.log(`Revenue Operations Ledger running at http://localhost:${port}`);
});
