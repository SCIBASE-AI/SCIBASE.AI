const { validateIPCompliance } = require('../src/index.js');

const payload = {
  ipTransferStrategy: "open",
  license: "Proprietary Commercial",
  transferAuthorization: null
};

console.log("Starting IP Management Compliance Guard...");
console.log("Analyzing payload manifest...");

const result = validateIPCompliance(payload);

console.log("\n--- Validation Results ---");
console.log(`Status: ${result.valid ? 'PASS' : 'FAIL'}`);
if (!result.valid) {
  console.log("Issues detected:");
  result.issues.forEach(issue => console.log(` - ${issue}`));
}

console.log("\nDemo complete.");
