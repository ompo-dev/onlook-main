// src/Editor/state/slices/styles-slice.ts
var createStylesSlice = (set2, get) => ({
  properties: [],
  computedStyles: {},
  parentDisplay: "",
  designTokens: [],
  elementVariables: [],
  selectedAttributes: {},
  selectedTextContent: "",
  setProperties: (props) => set2((state2) => {
    state2.properties = props;
  }),
  setComputedStyles: (styles) => set2((state2) => {
    state2.computedStyles = styles;
  }),
  setParentDisplay: (display) => {
    if (display !== get().parentDisplay) {
      set2((state2) => {
        state2.parentDisplay = display;
      });
    }
  },
  setDesignTokens: (tokens) => set2((state2) => {
    state2.designTokens = tokens;
  }),
  setElementVariables: (vars) => set2((state2) => {
    state2.elementVariables = vars;
  }),
  updateProperty: (name, value) => set2((state2) => {
    const prop = state2.properties.find((p) => p.name === name);
    if (prop) {
      prop.value = value;
    }
  }),
  setSelectedAttributes: (attrs) => set2((state2) => {
    state2.selectedAttributes = attrs;
  }),
  setSelectedTextContent: (text) => set2((state2) => {
    state2.selectedTextContent = text;
  })
});

