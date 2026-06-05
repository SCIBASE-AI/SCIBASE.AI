const { validateReproducibility } = require('../src/index.js');

const payload = {
  manifest: {
    dependencies: {
      "scikit-learn": "1.4.1.post1",
      "numpy": "^1.26.4", // Intentional violation
      "pandas": "2.2.1"
    }
  }
};

console.log("Starting Reproducibility Dependency Guard...");
console.log("Analyzing payload manifest...");

const result = validateReproducibility(payload);

console.log("\n--- Validation Results ---");
console.log(`Status: ${result.valid ? 'PASS' : 'FAIL'}`);
if (!result.valid) {
  console.log("Issues detected:");
  result.issues.forEach(issue => console.log(` - ${issue}`));
}

console.log("\nDemo complete.");
