# Requirements Map

Issue #12 describes a real-time collaborative research editor with rich scientific formatting, Jupyter notebook integration, collaboration controls, versioning, and task workflow. This slice adds an accessibility parity gate across those surfaces.

## Rich Scientific Formatting

- Verifies LaTeX equation blocks include screen-reader friendly spoken text.
- Checks shared toolbar controls have accessible names and keyboard reachability.
- Ensures controls are available in both Markdown and WYSIWYG modes.

## Jupyter Notebook Integration

- Checks notebook cells are reachable by keyboard.
- Requires alt text for visual notebook outputs such as plots and images.
- Includes notebook controls in the focus-order audit.

## Real-Time Collaboration

- Validates inline comments and suggestions have document anchors.
- Requires aria labels for collaborative comments and suggestions.
- Checks section locks announce state changes to assistive technology.

## Version History And Autosave

- Produces a deterministic review packet that can be stored with a named release or autosave checkpoint.
- Flags focus-order drift before a release snapshot is shared.

## Integrated Task Workflow

- Uses the same metadata pattern for comments, suggestions, and lock-linked work items so blocked controls can be routed into release tasks.
