function validateIPCompliance(payload) {
  const result = {
    valid: true,
    issues: []
  };

  if (!payload || !payload.ipTransferStrategy) {
    result.valid = false;
    result.issues.push("Missing ipTransferStrategy in payload.");
    return result;
  }

  const validStrategies = ["default", "sponsored", "open"];
  if (!validStrategies.includes(payload.ipTransferStrategy)) {
    result.valid = false;
    result.issues.push(`Unsupported ipTransferStrategy: ${payload.ipTransferStrategy}`);
  }

  if (payload.ipTransferStrategy === "open") {
    const proprietaryKeywords = ["proprietary", "commercial", "closed"];
    const license = (payload.license || "").toLowerCase();
    
    const isProprietary = proprietaryKeywords.some(kw => license.includes(kw));
    if (isProprietary) {
      result.valid = false;
      result.issues.push(`Proprietary license not allowed under 'open' strategy: ${payload.license}`);
    }
  }

  if (payload.ipTransferStrategy === "sponsored") {
    if (!payload.transferAuthorization) {
      result.valid = false;
      result.issues.push("Missing transferAuthorization for 'sponsored' strategy.");
    }
  }

  return result;
}

module.exports = {
  validateIPCompliance
};
