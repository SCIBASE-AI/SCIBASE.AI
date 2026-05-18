# Revenue Forecast Scenario Planner

This module adds a focused revenue-infrastructure slice for scenario planning. It turns subscription seats, AI compute usage, and analytics licensing pipeline assumptions into deterministic monthly forecasts, risk actions, and downside/base/upside totals.

It is intentionally credential-free: it does not connect to Stripe, PayPal, bank rails, wallets, or any paid API. It models the planning and finance-control layer that would sit above those integrations.

## Covers Issue #20

- Tiered subscription revenue with monthly or annual discount recognition
- AI compute overage forecasting against included plan quotas
- Licensing/API pipeline revenue with probability weighting
- Finance actions for quota pressure, renewal risk, and low-confidence licensing deals
- Downside/base/upside scenarios without exposing private customer names

## Run

```bash
node --test revenue-forecast-scenario-planner/test.mjs
node revenue-forecast-scenario-planner/demo.mjs
```

`demo.mp4` is a short generated walkthrough for bounty review. It is generated from `demo-video.txt` with:

```bash
ffmpeg -y -f lavfi -i color=c=0x111827:s=1280x720:d=8 -vf "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf:textfile=revenue-forecast-scenario-planner/demo-video.txt:fontcolor=white:fontsize=28:x=60:y=60:line_spacing=10" -c:v libx264 -pix_fmt yuv420p revenue-forecast-scenario-planner/demo.mp4
```

## Data Safety

Inputs may include private customer names for local operator context, but `buildRevenueForecast` only emits account IDs and deal IDs. The forecast object avoids serializing `customerName` fields so finance reports can be shared without leaking private account names.
