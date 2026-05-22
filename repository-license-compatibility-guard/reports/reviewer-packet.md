# Repository License Compatibility Guard

Repository: repo-neuro-open-atlas
Version: v1.4.0
Export intent: public_doi_and_commercial_partner_export
Audit digest: `734ff57751d2a28105e23bf2507f2da485edf49f470f9048cb1e19b332b9d71b`

## Totals

- Assets evaluated: 7
- Release-blocking assets: 3
- conflict: 1
- hold: 2
- notice_required: 2
- publishable: 2

## Asset Decisions

### asset-code-core

- Path: code/atlas_pipeline.py
- Type: code
- License: MIT
- Status: publishable
- Release blocking: false
- Reasons: license is compatible with the requested release/export intent
- Actions: Allow asset in DOI/export package; Preserve license metadata in manifest

### asset-dataset-images

- Path: data/images-manifest.json
- Type: dataset
- License: CC-BY-4.0
- Status: notice_required
- Release blocking: false
- Reasons: license permits export but attribution or notice is incomplete
- Actions: Add license notice to export manifest; Include attribution in citation and repository notice files

### asset-training-table

- Path: data/training-table.csv
- Type: dataset
- License: CC-BY-NC-4.0
- Status: conflict
- Release blocking: true
- Reasons: non-commercial license conflicts with commercial partner export intent
- Actions: Block commercial export until asset is relicensed or omitted; Generate public-only export variant if permitted

### asset-model-weights

- Path: models/segmentation-weights.bin
- Type: model
- License: Proprietary
- Status: hold
- Release blocking: true
- Reasons: asset license is proprietary, restricted, or unknown
- Actions: Exclude from public DOI/export package; Request rights review and replacement artifact

### asset-notebook

- Path: notebooks/analysis.ipynb
- Type: notebook
- License: GPL-3.0
- Status: notice_required
- Release blocking: false
- Reasons: license permits export but attribution or notice is incomplete
- Actions: Add license notice to export manifest; Include attribution in citation and repository notice files

### asset-figure

- Path: results/figure-3.svg
- Type: figure
- License: CC0-1.0
- Status: publishable
- Release blocking: false
- Reasons: license is compatible with the requested release/export intent
- Actions: Allow asset in DOI/export package; Preserve license metadata in manifest

### asset-raw-supplement

- Path: data/supplement-private.tsv
- Type: dataset
- License: (missing)
- Status: hold
- Release blocking: true
- Reasons: asset has no normalized SPDX or data license
- Actions: Hold tagged release and export bundle; Attach license metadata or remove asset from export
