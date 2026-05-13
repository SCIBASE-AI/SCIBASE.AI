import http from "node:http";
import { apiSurface, institution, subscribers } from "./sample-data.js";
import {
  buildAdminDashboard,
  buildApiCatalog,
  buildComplianceExport,
  buildEnterpriseDashboard,
  buildFormattingPlugins,
  buildUsageAnalytics,
  planWebhookDelivery
} from "./tooling.js";

const routes = {
  "/api/admin": () => buildAdminDashboard(institution),
  "/api/analytics": () => buildUsageAnalytics(institution),
  "/api/compliance": () => buildComplianceExport(institution),
  "/api/catalog": () => buildApiCatalog(apiSurface),
  "/api/webhooks": () => planWebhookDelivery(subscribers),
  "/api/plugins": () => buildFormattingPlugins(),
  "/api/dashboard": () => buildEnterpriseDashboard(institution, apiSurface, subscribers)
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  const handler = routes[url.pathname];
  response.setHeader("content-type", "application/json; charset=utf-8");
  if (!handler) {
    response.statusCode = 404;
    response.end(JSON.stringify({ error: "not_found", routes: Object.keys(routes) }));
    return;
  }
  response.end(JSON.stringify(handler(), null, 2));
});

const port = Number(process.env.PORT ?? 4336);
server.listen(port, () => {
  console.log(`Enterprise research tooling listening on http://localhost:${port}`);
});
