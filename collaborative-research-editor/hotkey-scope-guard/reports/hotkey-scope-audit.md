# Hotkey Scope Guard

Document: Collaborative CRISPR Preprint Editor
Decision: hold-hotkey-map
Risk score: 100/100
Evidence digest: ea72c70419e0ab48

## Scope

Commands: 5
Bindings: 5
Scenarios: 4

## Findings

### 1. GLOBAL_BROWSER_COLLISION (high)
Binding bind-refresh-preview collides with a browser-reserved shortcut.

Recommendation: Move the shortcut behind an editor-local chord or remove the browser-reserved binding.

Evidence:
```json
{
  "bindingId": "bind-refresh-preview",
  "keys": "Meta+R",
  "commandId": "cmd-format-block",
  "scope": "global"
}
```

### 2. MISSING_FOCUS_GUARD (medium)
Binding bind-refresh-preview does not require editor focus before execution.

Recommendation: Check active focus target before executing any collaborative editor shortcut.

Evidence:
```json
{
  "bindingId": "bind-refresh-preview",
  "keys": "Meta+R",
  "commandId": "cmd-format-block"
}
```

### 3. MODE_UNSCOPED_FORMATTING (medium)
Binding bind-refresh-preview mutates content without mode-specific scoping.

Recommendation: Require explicit Markdown, LaTeX, WYSIWYG, or notebook mode scoping for formatting commands.

Evidence:
```json
{
  "bindingId": "bind-refresh-preview",
  "commandId": "cmd-format-block",
  "action": "format-block"
}
```

### 4. APP_NAVIGATION_COLLISION (high)
Binding bind-go-comments can hijack workspace navigation outside the editor.

Recommendation: Scope the binding to the active editor surface so workspace navigation is not hijacked.

Evidence:
```json
{
  "bindingId": "bind-go-comments",
  "keys": "g c",
  "scope": "workspace",
  "expectedScope": "editor-surface"
}
```

### 5. MISSING_FOCUS_GUARD (medium)
Binding bind-go-comments does not require editor focus before execution.

Recommendation: Check active focus target before executing any collaborative editor shortcut.

Evidence:
```json
{
  "bindingId": "bind-go-comments",
  "keys": "g c",
  "commandId": "cmd-collab-nav"
}
```

### 6. ASSISTIVE_TECH_COLLISION (medium)
Binding bind-format-block conflicts with accessibility navigation.

Recommendation: Remap shortcuts that conflict with screen-reader or OS accessibility navigation.

Evidence:
```json
{
  "bindingId": "bind-format-block",
  "keys": "Ctrl+Alt+ArrowDown",
  "assistiveTechnology": "screen reader paragraph navigation"
}
```

### 7. MODE_UNSCOPED_FORMATTING (medium)
Binding bind-format-block mutates content without mode-specific scoping.

Recommendation: Require explicit Markdown, LaTeX, WYSIWYG, or notebook mode scoping for formatting commands.

Evidence:
```json
{
  "bindingId": "bind-format-block",
  "commandId": "cmd-format-block",
  "action": "format-block"
}
```

### 8. LOCKED_SECTION_MUTATION (high)
Scenario locked-final-figure can mutate a locked section through a shortcut.

Recommendation: Block mutation shortcuts inside locked/final-review sections and offer comment-only actions.

Evidence:
```json
{
  "scenarioId": "locked-final-figure",
  "bindingId": "bind-refresh-preview",
  "commandId": "cmd-format-block",
  "sectionId": "final-figure-caption",
  "lockOwner": "editorial-board"
}
```

### 9. PRIVILEGE_BYPASS (high)
Scenario locked-final-figure bypasses the expected permission denial path.

Recommendation: Run shortcut commands through the same permission gate as toolbar and menu actions.

Evidence:
```json
{
  "scenarioId": "locked-final-figure",
  "bindingId": "bind-refresh-preview",
  "commandId": "cmd-format-block",
  "actorRole": "coauthor"
}
```

### 10. UNANNOUNCED_REMOTE_ACTION (medium)
Scenario locked-final-figure mutates shared state without an audit event.

Recommendation: Generate a visible audit event before a shortcut mutates shared document state.

Evidence:
```json
{
  "scenarioId": "locked-final-figure",
  "bindingId": "bind-refresh-preview",
  "commandId": "cmd-format-block"
}
```

### 11. NOTEBOOK_EXECUTION_COLLISION (high)
Scenario notebook-markdown-focus can execute notebook code from a non-notebook surface.

Recommendation: Separate notebook execution bindings from manuscript editing and require notebook focus.

Evidence:
```json
{
  "scenarioId": "notebook-markdown-focus",
  "bindingId": "bind-run-cell",
  "keys": "Shift+Enter",
  "surface": "markdown-block"
}
```

### 12. UNANNOUNCED_REMOTE_ACTION (medium)
Scenario notebook-markdown-focus mutates shared state without an audit event.

Recommendation: Generate a visible audit event before a shortcut mutates shared document state.

Evidence:
```json
{
  "scenarioId": "notebook-markdown-focus",
  "bindingId": "bind-run-cell",
  "commandId": "cmd-run-notebook-cell"
}
```

### 13. ANONYMOUS_REVIEWER_LEAK (high)
Scenario anonymous-reviewer-suggestion can reveal an anonymous reviewer through shortcut side effects.

Recommendation: Prevent shortcut-triggered labels, mentions, or presence pings from exposing anonymous reviewers.

Evidence:
```json
{
  "scenarioId": "anonymous-reviewer-suggestion",
  "bindingId": "bind-accept-suggestion",
  "commandId": "cmd-accept-suggestion",
  "broadcastsPresence": true,
  "revealsActor": true
}
```

### 14. UNANNOUNCED_REMOTE_ACTION (medium)
Scenario anonymous-reviewer-suggestion mutates shared state without an audit event.

Recommendation: Generate a visible audit event before a shortcut mutates shared document state.

Evidence:
```json
{
  "scenarioId": "anonymous-reviewer-suggestion",
  "bindingId": "bind-accept-suggestion",
  "commandId": "cmd-accept-suggestion"
}
```

### 15. NOTEBOOK_EXECUTION_COLLISION (high)
Scenario notebook-formatting-collision routes a manuscript formatting shortcut inside a notebook cell.

Recommendation: Separate notebook execution bindings from manuscript editing and require notebook focus.

Evidence:
```json
{
  "scenarioId": "notebook-formatting-collision",
  "bindingId": "bind-format-block",
  "keys": "Ctrl+Alt+ArrowDown",
  "commandId": "cmd-format-block",
  "surface": "notebook-cell"
}
```
