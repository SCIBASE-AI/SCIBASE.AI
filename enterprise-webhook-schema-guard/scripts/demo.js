const { validateWebhookSchema } = require('../src/index.js');

const payload = {
  event_type: "project.publication",
  timestamp: "2026-06-05T12:00:00Z",
  signature: "invalid-signature",
  data: { project_id: "P-001" }
};

console.log("Starting Enterprise Webhook Schema Guard...");
const result = validateWebhookSchema(payload);
console.log(`Status: ${result.valid ? 'PASS' : 'FAIL'}`);
result.issues.forEach(i => console.log(` - ${i}`));
