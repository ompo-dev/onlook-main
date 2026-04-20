export interface DomNode {
    id: number;
    localName: string;
    className: string;
    attributes: Record<string, string>;
    children: DomNode[];
    textContent: string;
    component?: string;
    source?: unknown;
}

export function convertTree(node: any): DomNode {
    return {
        id: node.id,
        localName: node.localName,
        className: typeof node.className === 'string' ? node.className : '',
        attributes: node.attributes ?? {},
        children: (node.children ?? []).map(convertTree),
        textContent: node.textContent ?? '',
        component: node.component,
        source: node.source,
    };
}
