# LaTeX Figure Anchor Lock Guard

Context: Real-Time Collaborative Editor
Status: needs-review

## Held Items
- fig-2: figure anchor is unlocked, LaTeX characters not escaped, figure moved after lock
- fig-3: caption is unlinked, figure asset missing

## Reviewer Actions
- fig-2: Lock figure anchor before export or concurrent review.
- fig-2: Escape LaTeX-sensitive caption or filename characters.
- fig-2: Revalidate figure order after collaborative move.
- fig-3: Link caption to figure anchor.
- fig-3: Restore figure asset or remove stale reference.

