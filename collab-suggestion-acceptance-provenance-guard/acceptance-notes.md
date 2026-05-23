# Acceptance Notes

## Reviewer Checks

- A suggestion with current section hash, stable quote anchor, valid lock override, required approvals, resolved replies, and fresh notebooks is accepted.
- A suggestion with only stale notebook output is deferred instead of permanently blocked.
- A suggestion with stale section hash, missing quote anchor, or missing required approval is escalated before mutation.
- Synthetic sample data contains no live manuscript text, credentials, private identity data, or payment data.

## Expected Commands

```bash
npm run check
npm test
npm run demo
```

Optional artifact validation:

```bash
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height -of default=noprint_wrappers=1 reports/demo.mp4
```
