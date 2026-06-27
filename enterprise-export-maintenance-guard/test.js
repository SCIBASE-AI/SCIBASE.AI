import assert from "node:assert/strict";
import { readyExportJob, riskyExportJob } from "./src/sampleJobs.js";
import { evaluateExportMaintenanceJob, renderMarkdownReport } from "./src/guard.js";

const readyResult = evaluateExportMaintenanceJob(readyExportJob);
assert.equal(readyResult.decision, "SEND");
assert.equal(readyResult.findingCount, 0);
assert.equal(readyResult.retryAfterMinutes, 0);

const riskyResult = evaluateExportMaintenanceJob(riskyExportJob);
assert.equal(riskyResult.decision, "HOLD");
assert.ok(riskyResult.findings.some((finding) => finding.code === "ACTIVE_DESTINATION_MAINTENANCE"));
assert.ok(riskyResult.findings.some((finding) => finding.code === "DEGRADED_DESTINATION_HEALTH"));
assert.ok(riskyResult.findings.some((finding) => finding.code === "STALE_DESTINATION_STATUS_EVIDENCE"));
assert.ok(riskyResult.findings.some((finding) => finding.code === "RETRY_WINDOW_EXCEEDS_POLICY"));

const report = renderMarkdownReport(riskyExportJob, riskyResult);
assert.match(report, /Enterprise Export Maintenance Guard Report/);
assert.match(report, /HOLD/);
assert.match(report, /ACTIVE_DESTINATION_MAINTENANCE/);

console.log("4 export maintenance guard tests passed");
