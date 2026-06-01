const assert = require("node:assert/strict");
const { evaluateChemicalIdentityGraph, sha256 } = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

const clean = evaluateChemicalIdentityGraph(cleanPacket);
assert.equal(clean.summary.decision, "publish_chemical_graph");
assert.equal(clean.summary.findingCount, 0);
assert.equal(clean.summary.compoundsReviewed, 2);
assert.equal(clean.summary.edgesReviewed, 2);
assert.ok(clean.summary.auditDigest.startsWith("sha256:"));

const risky = evaluateChemicalIdentityGraph(riskyPacket);
assert.equal(risky.summary.decision, "hold_chemical_graph");
assert.equal(risky.summary.compoundsReviewed, 5);
assert.equal(risky.summary.edgesReviewed, 4);
assert.ok(risky.summary.heldNodes >= 1);
assert.ok(risky.summary.heldEdges >= 2);
assert.ok(risky.summary.findingCount >= 13);
assert.ok(risky.summary.criticalFindings >= 4);
assert.ok(risky.summary.highOrCriticalFindings >= 9);

const findingCodes = new Set(risky.findings.map((finding) => finding.code));
assert.ok(findingCodes.has("STEREOCHEMISTRY_MISSING"));
assert.ok(findingCodes.has("CHEMICAL_IDENTITY_EVIDENCE_MISSING"));
assert.ok(findingCodes.has("SYNONYM_COLLISION_ACROSS_COMPOUNDS"));
assert.ok(findingCodes.has("SAME_AS_SKELETON_MISMATCH"));
assert.ok(findingCodes.has("SAME_AS_FORM_CONFLATION"));
assert.ok(findingCodes.has("ASSAY_CONTEXT_INCOMPLETE"));
assert.ok(findingCodes.has("ASSAY_FORM_CONTEXT_MISMATCH"));
assert.ok(findingCodes.has("EDGE_EVIDENCE_DOI_MISSING"));
assert.ok(findingCodes.has("CHEMICAL_EDGE_NODE_MISSING"));
assert.ok(findingCodes.has("INCHIKEY_FORMAT_INVALID"));
assert.ok(findingCodes.has("ISOMERIC_SMILES_MISSING"));
assert.ok(findingCodes.has("ISOTOPE_LABEL_MISSING"));

const firstDigest = evaluateChemicalIdentityGraph(riskyPacket).summary.auditDigest;
const secondDigest = evaluateChemicalIdentityGraph(riskyPacket).summary.auditDigest;
assert.equal(firstDigest, secondDigest);
assert.equal(sha256({ b: 2, a: 1 }), sha256({ a: 1, b: 2 }));

console.log("chemical identity stereochemistry guard tests passed");
