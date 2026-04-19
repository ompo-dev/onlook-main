// src/Editor/AnimationsPanel/EditableInput.tsx
import { jsx as jsx66 } from "react/jsx-runtime";
function EditableInput({ initialValue = "", placeholder, className, validate, onCommit, onCancel }) {
  const [value, setValue] = useState29(initialValue);
  const ref = useRef36(null);
  useEffect36(() => {
    ref.current?.focus();
    if (initialValue) ref.current?.select();
  }, []);
  return /* @__PURE__ */ jsx66(
    "input",
    {
      ref,
      className: className ?? AnimationsPanel_default.nameInput,
      value,
      onChange: (e) => setValue(validate ? validate(e.target.value) : e.target.value),
      onBlur: () => {
        if (value && value !== initialValue) onCommit(value);
        else onCancel ? onCancel() : onCommit(initialValue);
      },
      onKeyDown: (e) => {
        if (e.key === "Enter") onCommit(value);
        if (e.key === "Escape") onCancel ? onCancel() : onCommit(initialValue);
      },
      onClick: (e) => e.stopPropagation(),
      placeholder
    }
  );
}

