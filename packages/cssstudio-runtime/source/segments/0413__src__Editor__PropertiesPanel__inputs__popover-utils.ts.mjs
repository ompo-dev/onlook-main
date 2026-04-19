// src/Editor/PropertiesPanel/inputs/popover-utils.ts
function computePopoverPosition(anchorRect, popoverHeight, popoverWidth = 240, panelEl, bottomInset = 0) {
  const MARGIN = 4;
  const GAP = 8;
  const TOOLBAR_BOTTOM = 56;
  let top;
  let left;
  const maxBottom = window.innerHeight - bottomInset;
  if (panelEl) {
    const panelRect = panelEl.getBoundingClientRect();
    const leftOfPanel = panelRect.left - popoverWidth - GAP;
    if (leftOfPanel >= MARGIN) {
      left = leftOfPanel;
    } else {
      left = panelRect.right + GAP;
    }
    top = anchorRect.top;
  } else {
    top = anchorRect.bottom + 6;
    if (top + popoverHeight > maxBottom) {
      top = anchorRect.top - popoverHeight - 6;
    }
    left = anchorRect.left;
  }
  top = Math.max(
    TOOLBAR_BOTTOM,
    Math.min(top, maxBottom - popoverHeight - MARGIN)
  );
  left = Math.max(
    MARGIN,
    Math.min(left, window.innerWidth - popoverWidth - MARGIN)
  );
  return { top, left };
}

