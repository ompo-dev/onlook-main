export interface ElementQuad {
    hasTransform: boolean;
    corners: DOMPoint[];
    width: number;
    height: number;
    untransformedX: number;
    untransformedY: number;
    matrix: DOMMatrix;
    inverseMatrix: DOMMatrix;
    cssTransform: string;
    scaleX: number;
    scaleY: number;
}

export function getElementQuad(el: Element): ElementQuad {
    const w = (el as HTMLElement).offsetWidth;
    const h = (el as HTMLElement).offsetHeight;
    if (!hasAnyTransform(el)) {
        const r = el.getBoundingClientRect();
        return {
            hasTransform: false,
            corners: [
                new DOMPoint(r.left, r.top),
                new DOMPoint(r.right, r.top),
                new DOMPoint(r.right, r.bottom),
                new DOMPoint(r.left, r.bottom),
            ],
            width: w,
            height: h,
            untransformedX: r.left,
            untransformedY: r.top,
            matrix: new DOMMatrix(),
            inverseMatrix: new DOMMatrix(),
            cssTransform: 'none',
            scaleX: 1,
            scaleY: 1,
        };
    }
    const matrix = getLocalToViewportMatrix(el);
    const untransformed = getUntransformedViewportPosition(el);
    const corners = [
        matrix.transformPoint(new DOMPoint(0, 0)),
        matrix.transformPoint(new DOMPoint(w, 0)),
        matrix.transformPoint(new DOMPoint(w, h)),
        matrix.transformPoint(new DOMPoint(0, h)),
    ];
    const rect = el.getBoundingClientRect();
    if (!validateQuad(corners, rect)) {
        return {
            hasTransform: false,
            corners: [
                new DOMPoint(rect.left, rect.top),
                new DOMPoint(rect.right, rect.top),
                new DOMPoint(rect.right, rect.bottom),
                new DOMPoint(rect.left, rect.bottom),
            ],
            width: w,
            height: h,
            untransformedX: rect.left,
            untransformedY: rect.top,
            matrix: new DOMMatrix(),
            inverseMatrix: new DOMMatrix(),
            cssTransform: 'none',
            scaleX: 1,
            scaleY: 1,
        };
    }
    const overlayMatrix = new DOMMatrix()
        .translateSelf(-untransformed.x, -untransformed.y)
        .multiplySelf(matrix);
    const cssTransform = `matrix(${overlayMatrix.a},${overlayMatrix.b},${overlayMatrix.c},${overlayMatrix.d},${overlayMatrix.e},${overlayMatrix.f})`;
    const scaleX = Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b);
    const scaleY = Math.sqrt(matrix.c * matrix.c + matrix.d * matrix.d);
    let inverseMatrix: DOMMatrix;
    try {
        inverseMatrix = matrix.inverse();
    } catch {
        inverseMatrix = new DOMMatrix();
    }
    return {
        hasTransform: true,
        corners,
        width: w,
        height: h,
        untransformedX: untransformed.x,
        untransformedY: untransformed.y,
        matrix,
        inverseMatrix,
        cssTransform,
        scaleX,
        scaleY,
    };
}

function getLocalToViewportMatrix(el: Element): DOMMatrix {
    let matrix = new DOMMatrix();
    let node: Element | null = el as Element;
    while (node) {
        const cs = getComputedStyle(node);
        if (cs.transform && cs.transform !== 'none') {
            const parts = cs.transformOrigin.split(' ');
            const ox = parseFloat(parts[0]) || 0;
            const oy = parseFloat(parts[1]) || 0;
            const xform = new DOMMatrix()
                .translateSelf(ox, oy)
                .multiplySelf(new DOMMatrix(cs.transform))
                .translateSelf(-ox, -oy);
            matrix = xform.multiply(matrix);
        }
        const parent = (node as HTMLElement).offsetParent;
        const scrollX = parent ? (parent as HTMLElement).scrollLeft : 0;
        const scrollY = parent ? (parent as HTMLElement).scrollTop : 0;
        matrix = new DOMMatrix()
            .translateSelf((node as HTMLElement).offsetLeft - scrollX, (node as HTMLElement).offsetTop - scrollY)
            .multiply(matrix);
        node = parent as Element | null;
    }
    matrix = new DOMMatrix().translateSelf(-window.scrollX, -window.scrollY).multiply(matrix);
    return matrix;
}

export function pointInQuad(px: number, py: number, corners: DOMPoint[]): boolean {
    const n = corners.length;
    if (n < 3) return false;
    let positive = 0;
    let negative = 0;
    for (let i = 0; i < n; i++) {
        const a = corners[i];
        const b = corners[(i + 1) % n];
        const cross = (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x);
        if (cross > 0) positive++;
        else if (cross < 0) negative++;
        if (positive > 0 && negative > 0) return false;
    }
    return true;
}

export function getMatrixRotation(m: DOMMatrix): number {
    return Math.atan2(m.b, m.a) * (180 / Math.PI);
}

function hasAnyTransform(el: Element): boolean {
    let node: Element | null = el;
    while (node) {
        const cs = getComputedStyle(node);
        if (cs.transform && cs.transform !== 'none') return true;
        node = (node as HTMLElement).offsetParent as Element | null;
    }
    return false;
}

function getUntransformedViewportPosition(el: Element): { x: number; y: number } {
    let x = 0;
    let y = 0;
    let node: Element | null = el as Element;
    while (node) {
        x += (node as HTMLElement).offsetLeft;
        y += (node as HTMLElement).offsetTop;
        const parent = (node as HTMLElement).offsetParent as HTMLElement | null;
        if (parent) {
            x -= parent.scrollLeft;
            y -= parent.scrollTop;
        }
        node = parent;
    }
    return { x: x - window.scrollX, y: y - window.scrollY };
}

function validateQuad(corners: DOMPoint[], rect: DOMRect): boolean {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const c of corners) {
        if (c.x < minX) minX = c.x;
        if (c.y < minY) minY = c.y;
        if (c.x > maxX) maxX = c.x;
        if (c.y > maxY) maxY = c.y;
    }
    const threshold = 3;
    return (
        Math.abs(minX - rect.left) < threshold &&
        Math.abs(minY - rect.top) < threshold &&
        Math.abs(maxX - rect.right) < threshold &&
        Math.abs(maxY - rect.bottom) < threshold
    );
}
