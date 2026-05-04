import type { ElementQuad } from './element-quad';

interface HostRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

type HostQuad = Omit<ElementQuad, 'matrix' | 'inverseMatrix'> & HostRect;

export function getIframeScale(iframe: HTMLIFrameElement) {
    const rect = iframe.getBoundingClientRect();
    return {
        x: rect.width / (iframe.clientWidth || 1),
        y: rect.height / (iframe.clientHeight || 1),
        rect,
    };
}

function scaleTransformMatrix(css: string, sx: number, sy: number) {
    if (css === 'none' || (sx === 1 && sy === 1)) {
        return css;
    }

    const matrixMatch = css.match(/matrix\((.+)\)/);
    if (!matrixMatch) {
        return css;
    }

    const values = matrixMatch[1]?.split(',').map(Number) ?? [];
    const [a = 1, b = 0, c = 0, d = 1, e = 0, f = 0] = values;
    return `matrix(${a},${sx === sy ? b : (sy * b) / sx},${sx === sy ? c : (sx * c) / sy},${d},${sx * e},${sy * f})`;
}

export function mapQuadToHost(iframe: HTMLIFrameElement, quad: ElementQuad): HostQuad {
    const { x: sx, y: sy, rect } = getIframeScale(iframe);
    return {
        x: rect.left + quad.untransformedX * sx,
        y: rect.top + quad.untransformedY * sy,
        width: quad.width * sx,
        height: quad.height * sy,
        hasTransform: quad.hasTransform,
        selfTransformed: quad.selfTransformed,
        cssTransform: scaleTransformMatrix(quad.cssTransform, sx, sy),
        scaleX: quad.scaleX,
        scaleY: quad.scaleY,
        corners: quad.corners.map((corner) => new DOMPoint(rect.left + corner.x * sx, rect.top + corner.y * sy)),
        untransformedX: rect.left + quad.untransformedX * sx,
        untransformedY: rect.top + quad.untransformedY * sy,
    };
}

export function mapRectToHost(iframe: HTMLIFrameElement, rect: HostRect) {
    const { x: sx, y: sy, rect: iframeRect } = getIframeScale(iframe);
    return {
        x: iframeRect.left + rect.x * sx,
        y: iframeRect.top + rect.y * sy,
        width: rect.width * sx,
        height: rect.height * sy,
    };
}

export function mapPointToIframe(
    iframe: HTMLIFrameElement,
    clientX: number,
    clientY: number,
    logicalWidth: number,
) {
    const rect = iframe.getBoundingClientRect();
    return {
        x: ((clientX - rect.left) / rect.width) * logicalWidth,
        y: ((clientY - rect.top) / rect.height) * (iframe.clientHeight || rect.height),
    };
}
