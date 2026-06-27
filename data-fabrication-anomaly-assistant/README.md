# Data Fabrication Anomaly Assistant

This is a focused AI-Powered Research Assistant Suite slice for issue #16. It reviews synthetic manuscript data packets before AI peer-review output is trusted and emits release, review, or hold decisions for data-forensics red flags.

The assistant checks:

- repeated measurement rows that need raw-data verification
- invalid collection timestamps that cannot be audited
- terminal-digit preference that suggests rounding or synthetic entry
- unusually smooth measurement series
- perfect group separation that needs preregistered exclusion and raw-row provenance

All fixtures are synthetic. The module does not call external AI services, publisher APIs, private datasets, credential stores, payment systems, or live manuscript systems.

## Run

```sh
npm run check
npm test
npm run demo
```

The demo writes reviewer artifacts under `reports/`.
