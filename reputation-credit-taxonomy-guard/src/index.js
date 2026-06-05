const VALID_CREDIT_ROLES = [
  "Conceptualization", "Data curation", "Formal analysis", "Funding acquisition",
  "Investigation", "Methodology", "Project administration", "Resources",
  "Software", "Supervision", "Validation", "Visualization",
  "Writing - original draft", "Writing - review & editing"
];

function validateCreditTaxonomy(payload) {
  const result = { valid: true, issues: [] };

  if (!payload || !payload.contributors || !Array.isArray(payload.contributors)) {
    result.valid = false;
    result.issues.push("Missing or invalid 'contributors' array.");
    return result;
  }

  for (const contributor of payload.contributors) {
    if (!contributor.roles || !Array.isArray(contributor.roles)) continue;
    
    for (const role of contributor.roles) {
      if (!VALID_CREDIT_ROLES.includes(role)) {
        result.valid = false;
        result.issues.push(`Invalid CRediT role assigned to ${contributor.name}: '${role}'`);
      }
    }
  }

  return result;
}

module.exports = { validateCreditTaxonomy };
