'use strict';

module.exports = {
  generatedAt: '2026-05-21T10:45:00.000Z',
  documentId: 'ms-collab-editor-demo',
  documentTitle: 'Shared CRISPR off-target analysis manuscript',
  focusOrder: [
    'toolbar-insert-equation',
    'notebook-cell-analysis-01',
    'comment-methods-01',
    'suggestion-results-01',
    'section-lock-final-figures',
    'missing-control'
  ],
  controls: [
    {
      id: 'toolbar-insert-equation',
      type: 'toolbar',
      label: 'Insert equation',
      ariaLabel: 'Insert LaTeX equation',
      keyboardShortcut: 'Mod+Shift+E',
      availableInModes: ['markdown', 'wysiwyg']
    },
    {
      id: 'equation-effect-size',
      type: 'equation',
      label: 'Effect size equation',
      latex: '\\\\Delta = mean(treatment) - mean(control)',
      accessibleText: ''
    },
    {
      id: 'notebook-cell-analysis-01',
      type: 'notebook-cell',
      label: 'Off-target summary plot cell',
      ariaLabel: 'Notebook cell with off-target summary plot',
      tabReachable: true,
      availableInModes: ['markdown'],
      outputKind: 'plot',
      outputAltText: ''
    },
    {
      id: 'comment-methods-01',
      type: 'comment',
      label: 'Methods reviewer comment',
      ariaLabel: 'Comment on methods randomization',
      tabReachable: true,
      availableInModes: ['markdown', 'wysiwyg'],
      anchorId: 'methods-randomization'
    },
    {
      id: 'suggestion-results-01',
      type: 'suggestion',
      label: 'Results wording suggestion',
      ariaLabel: '',
      tabReachable: false,
      availableInModes: ['wysiwyg'],
      anchorId: ''
    },
    {
      id: 'section-lock-final-figures',
      type: 'lock',
      label: 'Final figures section lock',
      ariaLabel: 'Lock final figures section',
      tabReachable: true,
      availableInModes: ['markdown', 'wysiwyg'],
      screenReaderAnnouncement: ''
    }
  ]
};
