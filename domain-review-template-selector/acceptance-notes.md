# Acceptance Notes

## Review Scenarios

1. Clinical manuscript
   - Clinical terms select a clinical peer-review template.
   - Patient eligibility, endpoint validity, safety reporting, and ethics/consent sections are included.

2. Machine-learning manuscript
   - Benchmark, model, training, and ablation terms select the machine-learning template.
   - Data split integrity, baseline comparison, ablation strength, and leakage risk sections are included.

3. Blocked wet-lab review packet
   - A CRISPR manuscript with unanchored claims is blocked before review.
   - Missing data, code, environment, run command, and output manifests are surfaced.

4. Computational reproducibility review
   - A computational manuscript with missing expected outputs is marked needs-review and routed to reproducibility expertise.

## Validation

```bash
node domain-review-template-selector/test.js
node domain-review-template-selector/demo.js
node --check domain-review-template-selector/index.js
node --check domain-review-template-selector/test.js
node --check domain-review-template-selector/demo.js
```

The included `demo.mp4` is a five-second visual walkthrough of domain classification, template selection, and review packet readiness.
