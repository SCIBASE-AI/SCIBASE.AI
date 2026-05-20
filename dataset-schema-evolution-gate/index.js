function normalizeField(field) {
  return {
    name: field.name,
    previousNames: field.previousNames || [],
    type: field.type || "unknown",
    role: field.role || "unknown",
    unit: field.unit || "",
    required: Boolean(field.required),
    nullable: Boolean(field.nullable),
    allowedValues: field.allowedValues || []
  };
}

function fieldsByName(schema) {
  const map = new Map();
  for (const rawField of schema || []) {
    const field = normalizeField(rawField);
    map.set(field.name, field);
    for (const previousName of field.previousNames) {
      if (!map.has(previousName)) map.set(previousName, field);
    }
  }
  return map;
}

function classifyTypeChange(before, after) {
  if (before.type === after.type) return null;
  if (before.type === "number" && after.type === "integer") {
    return {
      severity: "warning",
      reason: "numeric narrowing may be acceptable if fractional historical values are absent"
    };
  }
  if (before.type === "integer" && after.type === "number") {
    return {
      severity: "info",
      reason: "integer to number is generally backward compatible"
    };
  }
  return {
    severity: "blocking",
    reason: `type changed from ${before.type} to ${after.type}`
  };
}

function compareSchemas(previousVersion, nextVersion) {
  const previousFields = (previousVersion.schema || []).map(normalizeField);
  const nextFields = (nextVersion.schema || []).map(normalizeField);
  const nextByName = fieldsByName(nextFields);
  const previousByName = fieldsByName(previousFields);
  const findings = [];

  for (const before of previousFields) {
    const after = nextByName.get(before.name);
    if (!after) {
      findings.push({
        field: before.name,
        severity: before.required ? "blocking" : "warning",
        kind: "removed_field",
        message: `${before.name} was removed from the new schema`
      });
      continue;
    }

    if (after.name !== before.name) {
      findings.push({
        field: before.name,
        replacement: after.name,
        severity: "warning",
        kind: "renamed_field",
        message: `${before.name} was renamed to ${after.name}; consumers need a migration alias`
      });
    }

    const typeChange = classifyTypeChange(before, after);
    if (typeChange) {
      findings.push({
        field: after.name,
        severity: typeChange.severity,
        kind: "type_change",
        message: typeChange.reason
      });
    }

    if (before.unit !== after.unit) {
      findings.push({
        field: after.name,
        severity: "warning",
        kind: "unit_change",
        message: `${before.name} unit changed from ${before.unit || "none"} to ${after.unit || "none"}`
      });
    }

    if (before.role !== after.role) {
      findings.push({
        field: after.name,
        severity: "blocking",
        kind: "semantic_role_change",
        message: `${before.name} role changed from ${before.role} to ${after.role}`
      });
    }

    if (!before.required && after.required) {
      findings.push({
        field: after.name,
        severity: "warning",
        kind: "required_tightening",
        message: `${after.name} became required`
      });
    }

    if (before.nullable && !after.nullable) {
      findings.push({
        field: after.name,
        severity: "warning",
        kind: "nullable_tightening",
        message: `${after.name} no longer accepts null values`
      });
    }

    if (before.allowedValues.length > 0 && after.allowedValues.length > 0) {
      const removedValues = before.allowedValues.filter((value) => !after.allowedValues.includes(value));
      if (removedValues.length > 0) {
        findings.push({
          field: after.name,
          severity: "blocking",
          kind: "enum_contraction",
          message: `${after.name} removed allowed values: ${removedValues.join(", ")}`
        });
      }
    }
  }

  for (const after of nextFields) {
    if (!previousByName.has(after.name) && after.previousNames.length === 0) {
      findings.push({
        field: after.name,
        severity: after.required ? "warning" : "info",
        kind: "added_field",
        message: `${after.name} was added to the schema`
      });
    }
  }

  return findings;
}

function resolveFieldName(requiredField, nextByName) {
  const match = nextByName.get(requiredField);
  return match ? match.name : requiredField;
}

function evaluateConsumerCompatibility(consumers, nextVersion, findings) {
  const nextByName = fieldsByName(nextVersion.schema || []);
  const blockingFields = new Set(findings.filter((finding) => finding.severity === "blocking").map((finding) => finding.field));
  const warningFields = new Set(findings.filter((finding) => finding.severity === "warning").map((finding) => finding.field));

  return consumers.map((consumer) => {
    const issues = [];
    for (const requiredField of consumer.requiredFields || []) {
      const nextField = nextByName.get(requiredField);
      if (!nextField) {
        issues.push({
          severity: "blocking",
          field: requiredField,
          message: `${consumer.id} requires missing field ${requiredField}`
        });
        continue;
      }

      const compatibleName = resolveFieldName(requiredField, nextByName);
      const acceptedTypes = consumer.acceptedTypes && consumer.acceptedTypes[requiredField];
      if (acceptedTypes && !acceptedTypes.includes(nextField.type)) {
        issues.push({
          severity: "blocking",
          field: compatibleName,
          message: `${consumer.id} expects ${requiredField} as ${acceptedTypes.join(" or ")}, received ${nextField.type}`
        });
      }

      if (blockingFields.has(compatibleName)) {
        issues.push({
          severity: "blocking",
          field: compatibleName,
          message: `${consumer.id} depends on a blocking schema change for ${compatibleName}`
        });
      } else if (warningFields.has(compatibleName)) {
        issues.push({
          severity: "warning",
          field: compatibleName,
          message: `${consumer.id} should review schema drift for ${compatibleName}`
        });
      }
    }

    const blocking = issues.some((issue) => issue.severity === "blocking");
    const warning = issues.some((issue) => issue.severity === "warning");
    return {
      id: consumer.id,
      kind: consumer.kind,
      description: consumer.description,
      decision: blocking ? "hold" : warning ? "review" : "compatible",
      issues
    };
  });
}

function buildMetadataUpdates(dataset, findings) {
  const changedFields = Array.from(new Set(findings.map((finding) => finding.field)));
  const variables = (dataset.schema || []).map((field) => ({
    name: field.name,
    propertyID: field.role,
    unitText: field.unit || undefined,
    valueRequired: Boolean(field.required)
  }));

  return {
    datacite: {
      identifier: dataset.doi,
      version: dataset.version,
      titles: [{ title: dataset.title }],
      descriptions: [
        {
          descriptionType: "TechnicalInfo",
          description: `Schema evolution review touched ${changedFields.length} field(s): ${changedFields.join(", ")}`
        }
      ]
    },
    schemaOrg: {
      "@context": "https://schema.org",
      "@type": "Dataset",
      identifier: dataset.doi,
      version: dataset.version,
      name: dataset.title,
      license: dataset.license,
      variableMeasured: variables
    }
  };
}

function buildReviewerActions(findings, compatibility) {
  const actions = [];
  const blockingFindings = findings.filter((finding) => finding.severity === "blocking");
  const heldConsumers = compatibility.filter((consumer) => consumer.decision === "hold");

  if (blockingFindings.length > 0) {
    actions.push("Hold automatic publication until blocking schema drift is acknowledged or migrated.");
  }
  if (heldConsumers.length > 0) {
    actions.push("Hold automatic publication until affected consumers have migration coverage.");
    actions.push(`Disable affected consumers before release: ${heldConsumers.map((consumer) => consumer.id).join(", ")}.`);
  }
  if (findings.some((finding) => finding.kind === "renamed_field")) {
    actions.push("Add migration aliases for renamed fields before API reuse.");
  }
  if (findings.some((finding) => finding.kind === "unit_change")) {
    actions.push("Record unit conversions in metadata and rerun notebooks that depend on changed units.");
  }
  if (actions.length === 0) {
    actions.push("Approve schema evolution and refresh previews, API metadata, and rerun cache.");
  }

  return actions;
}

function buildAudit(previousVersion, nextVersion, consumers) {
  const findings = compareSchemas(previousVersion, nextVersion);
  const compatibility = evaluateConsumerCompatibility(consumers, nextVersion, findings);
  const metadataUpdates = buildMetadataUpdates(nextVersion, findings);
  const reviewerActions = buildReviewerActions(findings, compatibility);
  const blockingCount = findings.filter((finding) => finding.severity === "blocking").length;
  const warningCount = findings.filter((finding) => finding.severity === "warning").length;
  const heldConsumerCount = compatibility.filter((consumer) => consumer.decision === "hold").length;
  const score = Math.max(0, 100 - blockingCount * 25 - warningCount * 8 - heldConsumerCount * 12);

  return {
    datasetId: nextVersion.datasetId,
    previousVersion: previousVersion.version,
    nextVersion: nextVersion.version,
    decision: blockingCount > 0 || heldConsumerCount > 0 ? "hold-for-migration" : warningCount > 0 ? "review-before-release" : "compatible",
    compatibilityScore: score,
    findings,
    compatibility,
    metadataUpdates,
    reviewerActions
  };
}

module.exports = {
  buildAudit,
  compareSchemas,
  evaluateConsumerCompatibility,
  buildMetadataUpdates,
  buildReviewerActions
};
