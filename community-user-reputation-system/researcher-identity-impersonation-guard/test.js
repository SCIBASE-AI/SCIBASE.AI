const assert = require("assert");
const { digest, evaluateIdentityTrust, levenshtein, renderMarkdownReport, renderSvgSummary } = require("./index");
const { impersonationProfile, reviewContext, verifiedProfile } = require("./sample-data");

const risky = evaluateIdentityTrust(impersonationProfile, reviewContext);
assert.strictEqual(risky.decision, "hold-profile-trust");
assert.ok(risky.riskScore >= 90, "impersonation packet should produce a strong hold score");
assert.ok(risky.findings.some((item) => item.code === "DUPLICATE_IDENTIFIER_CLAIM"));
assert.ok(risky.findings.some((item) => item.code === "UNVERIFIED_IDENTIFIER"));
assert.ok(risky.findings.some((item) => item.code === "AFFILIATION_DOMAIN_MISMATCH"));
assert.ok(risky.findings.some((item) => item.code === "RESERVED_NAME_COLLISION"));
assert.ok(risky.findings.some((item) => item.code === "LOOKALIKE_HANDLE_COLLISION"));
assert.ok(risky.findings.some((item) => item.code === "RECENT_PROFILE_REBRAND_NEAR_TRUST_EVENT"));
assert.ok(risky.findings.some((item) => item.code === "ANONYMOUS_REVIEW_IDENTITY_LINKAGE"));
assert.ok(risky.heldEvents.some((event) => event.action === "block"));

const repeat = evaluateIdentityTrust(impersonationProfile, reviewContext);
assert.strictEqual(risky.auditDigest, repeat.auditDigest, "audit digest must be deterministic");

const safe = evaluateIdentityTrust(verifiedProfile, reviewContext);
assert.strictEqual(safe.decision, "safe-to-trust");
assert.strictEqual(safe.findings.length, 0);
assert.strictEqual(safe.heldEvents.length, 0);

const markdown = renderMarkdownReport(risky);
assert.ok(markdown.includes("Researcher Identity Impersonation Review"));
assert.ok(markdown.includes("Synthetic profile packets only"));

const svg = renderSvgSummary(risky);
assert.ok(svg.includes("<svg"));
assert.ok(svg.includes("Researcher Identity Impersonation Guard"));

assert.strictEqual(levenshtein("elena-v0ss-lab", "elena-voss-lab"), 1);
assert.strictEqual(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }));

console.log("researcher-identity-impersonation-guard tests passed");
