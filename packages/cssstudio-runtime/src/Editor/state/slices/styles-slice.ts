import type { StateCreator } from 'zustand';

export interface CssProperty {
    name: string;
    value: string;
    source: 'inline' | 'matched';
    selector?: string;
}

export interface DesignToken {
    name: string;
    value: string;
}

export interface StylesSlice {
    properties: CssProperty[];
    computedStyles: Record<string, string>;
    parentDisplay: string;
    designTokens: DesignToken[];
    elementVariables: DesignToken[];
    selectedAttributes: Record<string, string>;
    selectedTextContent: string;
    setProperties: (props: CssProperty[]) => void;
    setComputedStyles: (styles: Record<string, string>) => void;
    setParentDisplay: (display: string) => void;
    setDesignTokens: (tokens: DesignToken[]) => void;
    setElementVariables: (vars: DesignToken[]) => void;
    updateProperty: (name: string, value: string) => void;
    setSelectedAttributes: (attrs: Record<string, string>) => void;
    setSelectedTextContent: (text: string) => void;
}

export const createStylesSlice: StateCreator<any, [['zustand/immer', never]], [], StylesSlice> = (set, get) => ({
    properties: [],
    computedStyles: {},
    parentDisplay: '',
    designTokens: [],
    elementVariables: [],
    selectedAttributes: {},
    selectedTextContent: '',
    setProperties: (props) => set((s: any) => { s.properties = props; }),
    setComputedStyles: (styles) => set((s: any) => { s.computedStyles = styles; }),
    setParentDisplay: (display) => {
        if (display !== (get() as any).parentDisplay) set((s: any) => { s.parentDisplay = display; });
    },
    setDesignTokens: (tokens) => set((s: any) => { s.designTokens = tokens; }),
    setElementVariables: (vars) => set((s: any) => { s.elementVariables = vars; }),
    updateProperty: (name, value) => set((s: any) => {
        const prop = s.properties.find((p: CssProperty) => p.name === name);
        if (prop) prop.value = value;
    }),
    setSelectedAttributes: (attrs) => set((s: any) => { s.selectedAttributes = attrs; }),
    setSelectedTextContent: (text) => set((s: any) => { s.selectedTextContent = text; }),
});
