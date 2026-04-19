// src/Editor/PropertiesPanel/inputs/EasingPopover/EasingInput.tsx
import { jsx as jsx53 } from "react/jsx-runtime";
function clampX(v) {
  return Math.round(Math.min(1, Math.max(0, v)) * 1e3) / 1e3;
}
function round3(v) {
  return Math.round(v * 1e3) / 1e3;
}
function parseBezierString(str) {
  const inner = str.replace(/cubic-bezier\s*\(\s*/i, "").replace(/\)\s*$/, "");
  const parts = inner.split(/[\s,]+/).map(Number);
  if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
    return [clampX(parts[0]), round3(parts[1]), clampX(parts[2]), round3(parts[3])];
  }
  return null;
}
function EasingInput({ value, onChange }) {
  const [locals, setLocals] = useState20(() => value.map(String));
  const suppressSync = useRef27(false);
  useEffect28(() => {
    if (suppressSync.current) return;
    setLocals(value.map(String));
  }, [value[0], value[1], value[2], value[3]]);
  const commit = useCallback31(
    (index, raw) => {
      const num = parseFloat(raw);
      if (isNaN(num)) return;
      const next2 = [...value];
      next2[index] = index === 0 || index === 2 ? clampX(num) : round3(num);
      onChange(next2);
    },
    [value, onChange]
  );
  const handlePaste = useCallback31(
    (e) => {
      const text = e.clipboardData.getData("text/plain").trim();
      const parsed = parseBezierString(text);
      if (parsed) {
        e.preventDefault();
        suppressSync.current = true;
        setLocals(parsed.map(String));
        onChange(parsed);
        requestAnimationFrame(() => {
          suppressSync.current = false;
        });
      }
    },
    [onChange]
  );
  const handleChange = useCallback31(
    (index, raw) => {
      suppressSync.current = true;
      setLocals((prev) => {
        const next2 = [...prev];
        next2[index] = raw;
        return next2;
      });
      commit(index, raw);
      requestAnimationFrame(() => {
        suppressSync.current = false;
      });
    },
    [commit]
  );
  return /* @__PURE__ */ jsx53("div", { className: EasingInput_default.bezierInputRow, children: locals.map((val, i) => /* @__PURE__ */ jsx53(
    "input",
    {
      className: EasingInput_default.bezierField,
      "data-testid": `bezier-input-${i}`,
      type: "text",
      inputMode: "decimal",
      value: val,
      onChange: (e) => handleChange(i, e.target.value),
      onPaste: i === 0 ? handlePaste : void 0,
      onBlur: () => {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          const clamped = i === 0 || i === 2 ? clampX(num) : round3(num);
          setLocals((prev) => {
            const next2 = [...prev];
            next2[i] = String(clamped);
            return next2;
          });
        }
      }
    },
    i
  )) });
}

