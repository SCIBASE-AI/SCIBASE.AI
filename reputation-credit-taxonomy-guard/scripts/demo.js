const { validateCreditTaxonomy } = require('../src/index.js');

const payload = {
  contributors: [
    { name: "Researcher A", roles: ["Investigation", "Idea Guy"] }
  ]
};

console.log("Starting Reputation Credit Taxonomy Guard...");
const result = validateCreditTaxonomy(payload);
console.log(`Status: ${result.valid ? 'PASS' : 'FAIL'}`);
result.issues.forEach(i => console.log(` - ${i}`));
