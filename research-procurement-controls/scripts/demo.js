const sampleLedger = require("../data/sample-procurement-ledger.json");
const { evaluateProcurementControls } = require("../src/procurement-controls");

const evaluation = evaluateProcurementControls(sampleLedger);

console.log(`Institution: ${evaluation.institution}`);
console.log(`Purchase orders: ${summarizeStatuses(evaluation.purchaseOrders)}`);
console.log(`Budget status: ${summarizeStatuses(evaluation.budgetSummaries)}`);
console.log(`Invoices: ${summarizeInvoiceStatuses(evaluation.invoiceReconciliation.invoiceResults)}`);
console.log(`Unbilled usage events: ${evaluation.invoiceReconciliation.unbilledUsage.length}`);
console.log(`Contract reviews ready: ${evaluation.contractReviews.filter((contract) => contract.readyForInstitutionalProcurement).length}/${evaluation.contractReviews.length}`);
console.log(`Audit digest: ${evaluation.auditExport.digest}`);

function summarizeStatuses(items) {
  return Object.entries(
    items.reduce((summary, item) => {
      summary[item.status] = (summary[item.status] || 0) + 1;
      return summary;
    }, {})
  )
    .map(([status, count]) => `${status}=${count}`)
    .join(", ");
}

function summarizeInvoiceStatuses(items) {
  return Object.entries(
    items.reduce((summary, item) => {
      summary[item.status] = (summary[item.status] || 0) + 1;
      return summary;
    }, {})
  )
    .map(([status, count]) => `${status}=${count}`)
    .join(", ");
}
