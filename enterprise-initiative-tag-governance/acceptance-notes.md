# Acceptance Notes

## Reviewer Checklist

- Confirm `assessEnterpriseInitiativeTags` accepts synthetic policies, projects, assignments, and evidence records.
- Confirm approved tags can appear in dashboard rollups and signed webhook events.
- Confirm restricted or expired tags are held before dashboard publication.
- Confirm mutually exclusive tags on the same project are blocked.
- Confirm funder, open-access, and reproducibility requirements are surfaced as blockers or warnings.

## Validation Evidence

Run locally from the repository root:

```bash
node enterprise-initiative-tag-governance/test.js
node enterprise-initiative-tag-governance/demo.js
node --check enterprise-initiative-tag-governance/index.js
node --check enterprise-initiative-tag-governance/test.js
node --check enterprise-initiative-tag-governance/demo.js
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height -of default=noprint_wrappers=1 enterprise-initiative-tag-governance/demo.mp4
```

Expected output includes:

- `enterprise-initiative-tag-governance tests passed`
- A reviewer packet at `enterprise-initiative-tag-governance/reports/reviewer-packet.json`
- A static demo frame at `enterprise-initiative-tag-governance/demo.svg`
- A 1280x720 H.264 MP4 demo at `enterprise-initiative-tag-governance/demo.mp4`
