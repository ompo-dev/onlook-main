// src/Editor/MetadataPanel/index.tsx
import { jsx as jsx76, jsxs as jsxs60 } from "react/jsx-runtime";
var GENERAL_FIELDS = [
  { field: "title", label: "Title" },
  { field: "description", label: "Description", multiline: true },
  { field: "charset", label: "Charset" },
  { field: "viewport", label: "Viewport" }
];
var OG_FIELDS = [
  { field: "ogTitle", label: "Title" },
  { field: "ogDescription", label: "Description", multiline: true },
  { field: "ogImage", label: "Image" }
];
var LINK_FIELDS = [
  { field: "favicon", label: "Favicon" }
];
function MetadataPanel({ fetchMetadata, onMetadataChange }) {
  const [metadata, setMetadata] = useState36(() => fetchMetadata());
  useEffect43(() => {
    setMetadata(fetchMetadata());
  }, [fetchMetadata]);
  const handleChange = useCallback45(
    (field, value) => {
      setMetadata((prev) => ({ ...prev, [field]: value }));
      onMetadataChange(field, value);
    },
    [onMetadataChange]
  );
  const renderFields = (fields) => fields.map(
    ({ field, label, multiline }) => multiline ? /* @__PURE__ */ jsx76(
      TextAreaInput,
      {
        label: field,
        displayName: label,
        value: metadata[field],
        onChange: (v) => handleChange(field, v)
      },
      field
    ) : /* @__PURE__ */ jsx76(
      TextInput,
      {
        label: field,
        displayName: label,
        value: metadata[field],
        onChange: (v) => handleChange(field, v)
      },
      field
    )
  );
  return /* @__PURE__ */ jsxs60("div", { className: MetadataPanel_default.panel, children: [
    /* @__PURE__ */ jsx76(Section, { title: "General", children: renderFields(GENERAL_FIELDS) }),
    /* @__PURE__ */ jsx76(Section, { title: "Social", children: renderFields(OG_FIELDS) }),
    /* @__PURE__ */ jsx76(Section, { title: "Links", children: renderFields(LINK_FIELDS) })
  ] });
}

