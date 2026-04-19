// src/Editor/PropertiesPanel/sections/VariablesSection.tsx
import { jsx as jsx61, jsxs as jsxs46 } from "react/jsx-runtime";
var GROUP_ORDER = ["color", "number", "unknown"];
var GROUP_LABELS = {
  color: "Colors",
  number: "Numbers",
  unknown: "Other"
};
function groupVariables(vars) {
  const buckets = /* @__PURE__ */ new Map();
  for (const v of vars) {
    const type = classifyTokenValue(v.value);
    let list = buckets.get(type);
    if (!list) {
      list = [];
      buckets.set(type, list);
    }
    list.push(v);
  }
  return GROUP_ORDER.filter((type) => buckets.has(type)).map((type) => ({ type, label: GROUP_LABELS[type], vars: buckets.get(type) }));
}
function stripDashes(name) {
  return name.trim().replace(/^-+/, "");
}
function VariablesSection({
  title,
  variables,
  onChange,
  onAdd,
  onRename,
  addTitle,
  resetKey,
  standalone,
  emptyMessage
}) {
  const [adding, setAdding] = useState26(false);
  const [newName, setNewName] = useState26("");
  const [newValue, setNewValue] = useState26("");
  const [editingName, setEditingName] = useState26(null);
  const [editNameValue, setEditNameValue] = useState26("");
  const filter2 = useFilter();
  const nameRef = useRef31(null);
  const editNameRef = useRef31(null);
  useEffect32(() => {
    if (adding) nameRef.current?.focus();
  }, [adding]);
  useEffect32(() => {
    if (editingName !== null) editNameRef.current?.select();
  }, [editingName]);
  function resetForm() {
    setAdding(false);
    setNewName("");
    setNewValue("");
  }
  useEffect32(resetForm, [resetKey]);
  function handleConfirm() {
    const trimmedName = stripDashes(newName);
    const trimmedValue = newValue.trim();
    if (!trimmedName || !trimmedValue) return;
    onAdd(trimmedName, trimmedValue);
    resetForm();
  }
  function handleKeyDown(e) {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") resetForm();
  }
  function handleRowBlur(e) {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    const trimmedName = stripDashes(newName);
    if (!trimmedName || !newValue.trim()) resetForm();
  }
  const handleAddClick = useCallback36((e) => {
    e.preventDefault();
    e.stopPropagation();
    setAdding(true);
    setNewName("");
    setNewValue("");
  }, []);
  const startEditName = useCallback36((name) => {
    setEditingName(name);
    setEditNameValue(name);
  }, []);
  const commitEditName = useCallback36(() => {
    if (editingName === null) return;
    const trimmed = stripDashes(editNameValue);
    if (trimmed && trimmed !== editingName) {
      onRename?.(editingName, trimmed);
    }
    setEditingName(null);
  }, [editingName, editNameValue, onRename]);
  const cancelEditName = useCallback36(() => {
    setEditingName(null);
  }, []);
  const filteredVars = useMemo20(
    () => filter2 ? variables.filter((v) => matchesFilter(v.name, filter2)) : variables,
    [variables, filter2]
  );
  const groups = useMemo20(() => groupVariables(filteredVars), [filteredVars]);
  if (!standalone && !emptyMessage && filteredVars.length === 0 && !adding) return null;
  const addForm = adding && /* @__PURE__ */ jsxs46("div", { className: VariablesSection_default.newRow, onBlur: handleRowBlur, children: [
    /* @__PURE__ */ jsx61(
      "input",
      {
        ref: nameRef,
        type: "text",
        className: VariablesSection_default.newInput,
        placeholder: "name",
        value: newName,
        onChange: (e) => setNewName(e.target.value),
        onKeyDown: handleKeyDown
      }
    ),
    /* @__PURE__ */ jsx61(
      "input",
      {
        type: "text",
        className: VariablesSection_default.newInput,
        placeholder: "value",
        value: newValue,
        onChange: (e) => setNewValue(e.target.value),
        onKeyDown: handleKeyDown
      }
    )
  ] });
  function renderVariable(v, type) {
    const isEditing = editingName === v.name;
    const labelOverride = onRename && isEditing ? /* @__PURE__ */ jsx61(
      "input",
      {
        ref: editNameRef,
        type: "text",
        className: `${inputs_default.label} ${inputs_default.mono} ${VariablesSection_default.editNameInput}`,
        value: editNameValue,
        onChange: (e) => setEditNameValue(e.target.value),
        onBlur: commitEditName,
        onKeyDown: (e) => {
          if (e.key === "Enter") commitEditName();
          if (e.key === "Escape") cancelEditName();
        }
      }
    ) : void 0;
    return type === "color" ? /* @__PURE__ */ jsx61(
      ColorInput,
      {
        label: v.name,
        value: v.value,
        mono: true,
        onChange: (val) => onChange(v.name, val),
        onLabelDoubleClick: onRename ? () => startEditName(v.name) : void 0,
        labelOverride
      },
      v.name
    ) : /* @__PURE__ */ jsx61(
      TextInput,
      {
        label: v.name,
        value: v.value,
        mono: true,
        onChange: (val) => onChange(v.name, val),
        onLabelDoubleClick: onRename ? () => startEditName(v.name) : void 0,
        labelOverride
      },
      v.name
    );
  }
  if (standalone) {
    return /* @__PURE__ */ jsxs46("div", { className: VariablesSection_default.standalone, children: [
      addForm,
      filteredVars.length === 0 && !adding && emptyMessage && /* @__PURE__ */ jsxs46("div", { className: VariablesSection_default.empty, children: [
        /* @__PURE__ */ jsx61("div", { children: emptyMessage }),
        /* @__PURE__ */ jsxs46("button", { className: VariablesSection_default.emptyAdd, onClick: handleAddClick, children: [
          /* @__PURE__ */ jsx61(PlusIcon, {}),
          " Add variable"
        ] })
      ] }),
      groups.map((group) => /* @__PURE__ */ jsxs46("div", { className: VariablesSection_default.group, children: [
        /* @__PURE__ */ jsxs46("div", { className: VariablesSection_default.groupHeader, children: [
          /* @__PURE__ */ jsx61("span", { className: VariablesSection_default.groupLabel, children: group.label }),
          /* @__PURE__ */ jsx61("button", { className: VariablesSection_default.groupAdd, onClick: handleAddClick, title: addTitle, children: /* @__PURE__ */ jsx61(PlusIcon, {}) })
        ] }),
        group.vars.map((v) => renderVariable(v, group.type))
      ] }, group.type))
    ] });
  }
  return /* @__PURE__ */ jsxs46(
    Section,
    {
      title,
      onAdd: handleAddClick,
      addTitle,
      children: [
        addForm,
        filteredVars.length === 0 && !adding && emptyMessage && /* @__PURE__ */ jsx61("div", { className: VariablesSection_default.empty, children: emptyMessage }),
        groups.map((group) => /* @__PURE__ */ jsxs46("div", { children: [
          groups.length > 1 && /* @__PURE__ */ jsx61("div", { className: VariablesSection_default.groupLabel, children: group.label }),
          group.vars.map((v) => renderVariable(v, group.type))
        ] }, group.type))
      ]
    }
  );
}

