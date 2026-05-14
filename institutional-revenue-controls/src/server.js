import http from "node:http";
import { sampleRevenueAccount } from "./sample-data.js";
import {
  buildApprovalRoute,
  buildFinanceAuditExport,
  buildRevenueControlsDashboard,
  reconcileInvoice,
  summarizeBudgets,
  validateRevenueAccount,
} from "./revenue-controls.js";

const port = Number(process.env.PORT || 4363);

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
  });
  res.end(JSON.stringify(body, null, 2));
}

export function createServer(account = sampleRevenueAccount) {
  return http.createServer((req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);

      if (req.method === "GET" && url.pathname === "/api/health") {
        sendJson(res, 200, { ok: true, module: "institutional-revenue-controls" });
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/validate") {
        sendJson(res, 200, validateRevenueAccount(account));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/budgets") {
        sendJson(res, 200, { budgets: summarizeBudgets(account) });
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/dashboard") {
        sendJson(res, 200, buildRevenueControlsDashboard(account));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/audit-export") {
        sendJson(res, 200, buildFinanceAuditExport(account));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/invoice") {
        const invoiceId = url.searchParams.get("id") || account.invoices[0]?.id;
        sendJson(res, 200, reconcileInvoice(account, invoiceId));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/approval-route") {
        const invoiceId = url.searchParams.get("id") || account.invoices[0]?.id;
        sendJson(res, 200, buildApprovalRoute(account, invoiceId));
        return;
      }

      sendJson(res, 404, { error: "Not found" });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createServer().listen(port, () => {
    console.log(`Institutional revenue controls API listening on http://localhost:${port}`);
  });
}
