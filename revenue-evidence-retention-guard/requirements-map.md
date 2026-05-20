# Requirements Map

| Issue #20 Requirement | Implementation Evidence |
| --- | --- |
| Tiered subscription billing for individuals, labs, and institutions | `sample-data.js` includes institutional and lab subscription packets; `index.js` applies segment-specific retention rules before subscription revenue release. |
| Secure payment and institutional invoicing | Required subscription evidence includes `invoice` and `payment_or_po`; missing or mutable payment evidence blocks revenue. |
| Usage-based AI compute billing | AI compute packets require job manifests, meter readings, cloud cost traces, and customer usage summaries. |
| Transparent quotas and usage meters | `meter_reading` and `customer_usage_summary` evidence are required for AI compute revenue packets. |
| Licensing APIs and analytics | Analytics licensing packets require license terms, export manifests, privacy review evidence, and customer usage summaries. |
| Never monetize private content | `evaluateLicensePrivacy()` quarantines analytics licensing revenue when export evidence contains private content or lacks approved privacy review. |
| Government and institutional customers | Retention policy is stricter for `government` and `institutional` customer segments and sample data covers both. |
| Long-term revenue scalability and sustainability | `evaluateRevenueEvidenceRetentionGuard()` produces deterministic release, hold, and quarantine decisions with finance tasks and audit digests. |
| Reviewer-ready proof | `test.js` covers release, controls, hold, quarantine, legal-hold, evidence-root, and summary behavior; `demo.js` generates JSON, Markdown, SVG, and MP4 artifacts. |
