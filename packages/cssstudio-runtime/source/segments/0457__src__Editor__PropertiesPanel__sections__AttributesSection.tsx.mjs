// src/Editor/PropertiesPanel/sections/AttributesSection.tsx
import { Fragment as Fragment24, jsx as jsx59, jsxs as jsxs44 } from "react/jsx-runtime";
var nextId3 = 0;
function AttributesSection({ attributes, onAttributeChange, onAttributeDelete, onAttributeRename }) {
  const [newAttrs, setNewAttrs] = useState24([]);
  const valueRefs = useRef30({});
  const { onRowContextMenu, RowContextMenu } = useRowContextMenu();
  const [editingName, setEditingName] = useState24(null);
  const [editNameValue, setEditNameValue] = useState24("");
  const editNameRef = useRef30(null);
  useEffect31(() => {
    if (editingName !== null) editNameRef.current?.select();
  }, [editingName]);
  const startEditName = useCallback34((name) => {
    setEditingName(name);
    setEditNameValue(name);
  }, []);
  const commitEditName = useCallback34(() => {
    if (editingName === null) return;
    const trimmed = editNameValue.trim();
    if (trimmed && trimmed !== editingName) {
      onAttributeRename?.(editingName, trimmed);
    }
    setEditingName(null);
  }, [editingName, editNameValue, onAttributeRename]);
  const cancelEditName = useCallback34(() => {
    setEditingName(null);
  }, []);
  const filter2 = useFilter();
  const f = (name) => matchesFilter(name, filter2);
  const attrEntries = Object.entries(attributes).filter(([name]) => name !== "style");
  const handleAddAttribute = useCallback34((e) => {
    e.preventDefault();
    e.stopPropagation();
    setNewAttrs((prev) => [...prev, { id: nextId3++, name: "", value: "" }]);
  }, []);
  const handleCommit = useCallback34(
    (attr) => {
      if (attr.name.trim()) {
        onAttributeChange(attr.name.trim(), attr.value);
      }
      setNewAttrs((prev) => prev.filter((a) => a.id !== attr.id));
      delete valueRefs.current[attr.id];
    },
    [onAttributeChange]
  );
  const focusValue = (id3) => {
    valueRefs.current[id3]?.focus();
  };
  const filteredEntries = attrEntries.filter(([name]) => f(name));
  if (filteredEntries.length === 0 && filter2) return null;
  return /* @__PURE__ */ jsxs44(Fragment24, { children: [
    /* @__PURE__ */ jsxs44(Section, { title: "Attributes", onAdd: handleAddAttribute, addTitle: "Add attribute", children: [
      filteredEntries.length > 0 ? filteredEntries.map(([name, value]) => {
        const isEditing = editingName === name;
        const labelOverride = isEditing ? /* @__PURE__ */ jsx59(
          "input",
          {
            ref: editNameRef,
            type: "text",
            className: `${inputs_default.label} ${inputs_default.mono}`,
            style: { background: "none", border: "none", borderBottom: "1px solid var(--cs-accent)", outline: "none", color: "var(--cs-foreground)", padding: 0 },
            value: editNameValue,
            onChange: (e) => setEditNameValue(e.target.value),
            onBlur: commitEditName,
            onKeyDown: (e) => {
              if (e.key === "Enter") commitEditName();
              if (e.key === "Escape") cancelEditName();
            }
          }
        ) : void 0;
        return /* @__PURE__ */ jsx59("div", { onContextMenu: (e) => onRowContextMenu(e, () => onAttributeDelete(name)), children: /* @__PURE__ */ jsx59(
          TextInput,
          {
            label: name,
            value,
            mono: true,
            onChange: (v) => onAttributeChange(name, v),
            onLabelDoubleClick: () => startEditName(name),
            labelOverride
          }
        ) }, name);
      }) : newAttrs.length === 0 ? /* @__PURE__ */ jsx59("div", { className: PropertiesPanel_default.emptyHint, children: "No attributes" }) : null,
      newAttrs.map((attr) => /* @__PURE__ */ jsxs44("div", { style: { display: "flex", gap: 4, alignItems: "center" }, children: [
        /* @__PURE__ */ jsx59(
          "input",
          {
            type: "text",
            placeholder: "name",
            autoFocus: true,
            style: {
              width: 80,
              padding: "2px 4px",
              background: "var(--cs-feint)",
              border: "1px solid var(--cs-border)",
              borderRadius: 3,
              color: "var(--cs-foreground)",
              fontFamily: "var(--cs-font-mono)",
              fontSize: 11,
              outline: "none"
            },
            onChange: (e) => {
              setNewAttrs(
                (prev) => prev.map(
                  (a) => a.id === attr.id ? { ...a, name: e.target.value } : a
                )
              );
            },
            onKeyDown: (e) => {
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                focusValue(attr.id);
              }
            }
          }
        ),
        /* @__PURE__ */ jsx59(
          "input",
          {
            ref: (el) => {
              valueRefs.current[attr.id] = el;
            },
            type: "text",
            placeholder: "value",
            value: attr.value,
            style: {
              flex: 1,
              padding: "2px 4px",
              background: "var(--cs-feint)",
              border: "1px solid var(--cs-border)",
              borderRadius: 3,
              color: "var(--cs-foreground)",
              fontFamily: "var(--cs-font-mono)",
              fontSize: 11,
              outline: "none"
            },
            onChange: (e) => {
              setNewAttrs(
                (prev) => prev.map(
                  (a) => a.id === attr.id ? { ...a, value: e.target.value } : a
                )
              );
            },
            onBlur: () => handleCommit(attr),
            onKeyDown: (e) => {
              if (e.key === "Enter") handleCommit(attr);
            }
          }
        )
      ] }, attr.id))
    ] }),
    RowContextMenu
  ] });
}

