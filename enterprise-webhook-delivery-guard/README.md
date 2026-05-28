# Enterprise Webhook Delivery Guard

This standalone SCIBASE issue #19 slice reviews institutional webhook delivery
health before enterprise integrations are marked ready.

It checks:

- Subscribers have active owners and idempotency keys.
- Retry policy uses exponential backoff within the configured retry budget.
- Dead-letter routing exists before stale failures accumulate.
- Recent success evidence is present for institutional subscribers.
- Failure packets redact emails and token-like values.

## Run

```bash
node enterprise-webhook-delivery-guard/test.js
node enterprise-webhook-delivery-guard/demo.js
python enterprise-webhook-delivery-guard/make-demo-video.py
```

Generated artifacts are written under `reports/` for review.
