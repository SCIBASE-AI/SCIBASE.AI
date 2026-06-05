function validateWebhookSchema(payload) {
  const result = { valid: true, issues: [] };

  if (!payload || !payload.event_type) {
    result.valid = false;
    result.issues.push("Missing event_type.");
    return result;
  }

  if (!payload.timestamp) {
    result.valid = false;
    result.issues.push("Missing timestamp.");
  } else if (isNaN(Date.parse(payload.timestamp))) {
    result.valid = false;
    result.issues.push("Invalid timestamp format.");
  }

  if (!payload.signature) {
    result.valid = false;
    result.issues.push("Missing payload signature.");
  } else if (!payload.signature.startsWith("sha256=")) {
    result.valid = false;
    result.issues.push("Invalid signature format. Must start with 'sha256='.");
  }

  if (!payload.data || typeof payload.data !== 'object') {
    result.valid = false;
    result.issues.push("Missing or invalid data object.");
  }

  return result;
}

module.exports = { validateWebhookSchema };
