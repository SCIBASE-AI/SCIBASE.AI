# Requirement Map

| Requirement | Evidence in this module | Verification |
| --- | --- | --- |
| Natural-language review suggestions | `src/planner.js` creates reviewer action text for unsupported claims, missing citations, small samples, and domain-specific omissions. | `test/planner.test.js` checks the highest severity review finding. |
| Clarity and coherence checks | Review packets flag overbroad claims that lack an evidence artifact or citation trail. | `npm test` validates unsupported-claim detection. |
| Statistical or methodological red flags | Small sample sizes near significance thresholds and missing domain controls are flagged. | `npm test` checks statistical risk categories. |
| Claims vs. evidence alignment | Every claim is checked for evidence ids, citation ids, protocol linkage, and method support. | `npm test` checks claim alignment output. |
| Reproducibility confidence | Projects are scored from raw data, clean pipeline, environment lock, tests, reported output, and prior attempts. | `npm test` verifies low-confidence and high-confidence cases. |
| Previous reproducibility attempts | Attempt records are attached to project reports and affect the score. | `npm test` verifies failed attempts reduce confidence. |
| Research gap finder | Corpus findings are grouped by topic intersection and scored for unresolved status, replication count, corpus activity, lab fit, and feasibility. | `npm test` verifies the top ranked topic intersection. |
| Personalized opportunity feed | Lab capabilities and researcher interests are used to shape priority and first actions. | `npm run demo` prints the ranked plan and audit hash. |
| Reviewer-ready evidence | Output includes required artifacts, first actions, gap rationale, and audit digest. | `npm run check` runs tests plus demo. |
