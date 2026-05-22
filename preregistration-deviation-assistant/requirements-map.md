# Requirements Map

Issue: SCIBASE.AI #16 AI-Powered Research Assistant Suite

## Auto Peer Review Reports

- Claims vs. evidence alignment: checked by comparing manuscript outcomes, subgroup claims, and exploratory labeling against the registration.
- Methodological red flags: checked through analysis model drift, multiple-testing correction, sample-size deviation, and post-hoc exclusions.
- Adaptive review readiness: output classifies manuscripts as `ready`, `review`, or `hold` before AI review suggestions are presented.

## Reproducibility Checker

- Registered analysis plan consistency: checks model, covariates, sample plan, exclusions, and amendments.
- Output consistency: deterministic audit digest makes reviewer packets repeatable.
- Links to previous attempts: registration identity and amendment metadata are carried into the reviewer packet.

## Research Gap Finder

- Honest opportunity framing: unregistered subgroups and exploratory findings are flagged so they can be framed as hypotheses rather than confirmatory discoveries.

## Safety Boundaries

- Uses synthetic sample data only.
- Makes no model calls, registry lookups, or external network requests.
- Stores no credentials, private manuscripts, patient records, or payout data.
