# Collaborative Editor Accessibility Parity Guard Report

Document: Shared CRISPR off-target analysis manuscript (ms-collab-editor-demo)
Status: hold_accessibility_release
Generated: 2026-05-21T10:45:00.000Z

## Summary

- Controls reviewed: 6
- Blockers: 6
- Warnings: 3
- Required modes: markdown, wysiwyg

## Blockers

- equation-effect-size: equation block has no accessible text
- notebook-cell-analysis-01: notebook visual output has no alt text
- suggestion-results-01: interactive control has no aria label
- suggestion-results-01: interactive control is not keyboard reachable
- suggestion-results-01: review annotation has no document anchor
- focus-order: focus order references unknown control missing-control

## Warnings

- notebook-cell-analysis-01: control is not available in both Markdown and WYSIWYG modes
- suggestion-results-01: control is not available in both Markdown and WYSIWYG modes
- section-lock-final-figures: section lock does not announce state changes

## Required Actions

- equation-effect-size: add spoken math text for equation-effect-size
- notebook-cell-analysis-01: add mode parity for notebook-cell-analysis-01
- notebook-cell-analysis-01: add output alt text for notebook cell notebook-cell-analysis-01
- suggestion-results-01: add an aria label to suggestion-results-01
- suggestion-results-01: make suggestion-results-01 reachable by tab order or shortcut
- suggestion-results-01: add mode parity for suggestion-results-01
- suggestion-results-01: anchor suggestion-results-01 to a manuscript block or notebook cell
- section-lock-final-figures: add lock/unlock announcement text for section-lock-final-figures
- focus-order: remove or define focus target missing-control

## Control Matrix

- toolbar-insert-equation (toolbar): 0 blockers, 0 warnings
- equation-effect-size (equation): 1 blockers, 0 warnings
- notebook-cell-analysis-01 (notebook-cell): 1 blockers, 1 warnings
- comment-methods-01 (comment): 0 blockers, 0 warnings
- suggestion-results-01 (suggestion): 3 blockers, 1 warnings
- section-lock-final-figures (lock): 0 blockers, 1 warnings
