// src/Editor/InPagePanel/use-undo-apply.ts
import { useCallback as useCallback46 } from "react";
function useUndoApply({ bridge }) {
  const { setComputedStyles, setSelectedAttributes, setSelectedTextContent, setElementVariables, queueEdit, selectNode, clearSelection } = useStore2();
  const applyDomOperation = useCallback46(
    (op, direction) => {
      const shouldRemove = direction === "undo" && op.action === "add" || direction === "redo" && op.action === "delete";
      if (shouldRemove) {
        bridge.detachElement(op.nodeId);
        bridge.fetchDomTree();
        clearSelection();
        selectElements([], null);
        queueEdit({ type: "delete", value: op.element.localName });
      } else {
        const newId = bridge.reinsertElement(op.element, op.parentId, op.beforeSiblingId);
        if (newId !== null) {
          op.nodeId = newId;
          bridge.fetchDomTree();
          selectNode(newId);
          selectElements([newId], newId);
          bridge.fetchStyles(newId);
          queueEdit({ type: "add-child", value: op.element.localName });
        }
      }
    },
    [bridge, clearSelection, selectNode, queueEdit]
  );
  const applySingleOperation = useCallback46(
    (op, direction) => {
      const value = direction === "undo" ? op.oldValue : op.newValue;
      const from = direction === "undo" ? op.newValue : op.oldValue;
      switch (op.type) {
        case "style":
          if (op.nodeId !== null) {
            bridge.setStyleProperty(op.nodeId, op.property, value);
            if (op.nodeId === useStore2.getState().selectedNodeId) {
              const updated = { ...useStore2.getState().computedStyles };
              updated[op.property] = value;
              setComputedStyles(updated);
            }
            if (op.property.startsWith("--")) {
              const selId = useStore2.getState().selectedNodeId;
              if (selId !== null) setElementVariables(bridge.fetchElementVariables(selId));
            }
          }
          break;
        case "attribute":
          if (op.nodeId !== null) {
            bridge.setAttribute(op.nodeId, op.property, value);
            const attrs = { ...useStore2.getState().selectedAttributes };
            attrs[op.property] = value;
            setSelectedAttributes(attrs);
          }
          break;
        case "attribute-delete":
          if (op.nodeId !== null) {
            if (value) {
              bridge.setAttribute(op.nodeId, op.property, value);
              const attrs = { ...useStore2.getState().selectedAttributes };
              attrs[op.property] = value;
              setSelectedAttributes(attrs);
            } else {
              bridge.removeAttribute(op.nodeId, op.property);
              const attrs = { ...useStore2.getState().selectedAttributes };
              delete attrs[op.property];
              setSelectedAttributes(attrs);
            }
          }
          break;
        case "text":
          if (op.nodeId !== null) {
            bridge.setTextContent(op.nodeId, value);
            setSelectedTextContent(value);
          }
          break;
        case "token":
          if (value === "") {
            bridge.removeDocumentProperty(`--${op.property}`);
          } else {
            bridge.setDocumentProperty(`--${op.property}`, value);
          }
          bridge.fetchDesignTokens();
          {
            const selId = useStore2.getState().selectedNodeId;
            if (selId !== null) setElementVariables(bridge.fetchElementVariables(selId));
          }
          break;
        case "keyframe": {
          const snapshot2 = direction === "undo" ? op.oldAnimSnapshot : op.newAnimSnapshot;
          if (snapshot2) {
            useStore2.getState().setAnimValueAnimations(structuredClone(snapshot2));
          }
          break;
        }
      }
      if (op.type === "keyframe") {
        queueEdit({ type: "keyframe", name: op.property, value });
      } else {
        const undoType = op.type === "attribute" ? "attr" : op.type === "attribute-delete" ? "attr-delete" : op.type;
        queueEdit({
          type: undoType,
          ...op.nodeId !== null ? getElementInfoById(op.nodeId) : {},
          name: op.property,
          value: `${from} \u2192 ${value}`
        });
      }
    },
    [bridge, setComputedStyles, setSelectedAttributes, setSelectedTextContent, setElementVariables, queueEdit]
  );
  const applyEntry = useCallback46(
    (entry, direction) => {
      if (entry.type === "batch") {
        for (const op of entry.operations) {
          applySingleOperation(op, direction);
        }
      } else if (entry.type === "dom") {
        applyDomOperation(entry, direction);
      } else {
        applySingleOperation(entry, direction);
      }
    },
    [applySingleOperation, applyDomOperation]
  );
  return { applySingleOperation, applyEntry };
}

