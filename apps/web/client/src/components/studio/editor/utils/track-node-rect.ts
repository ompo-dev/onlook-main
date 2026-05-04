import { frame, cancelFrame } from 'motion-dom';
import { getElementQuad } from './element-quad';
import { getElement } from '../state/dom-bridge';
import { useStore } from '../state/use-store';

interface ResponsiveBridgeLike {
    getHostElementQuad?: (nodeId: number) => Promise<{
        x: number;
        y: number;
        width: number;
        height: number;
        hasTransform: boolean;
        selfTransformed: boolean;
        cssTransform: string;
        scaleX: number;
        scaleY: number;
        corners: DOMPoint[];
    } | null>;
}

function rectsEqual(
    a: {
        x: number;
        y: number;
        width: number;
        height: number;
        hasTransform: boolean;
        selfTransformed: boolean;
        cssTransform: string;
        scaleX: number;
        scaleY: number;
        corners: DOMPoint[];
    } | null,
    b: {
        x: number;
        y: number;
        width: number;
        height: number;
        hasTransform: boolean;
        selfTransformed: boolean;
        cssTransform: string;
        scaleX: number;
        scaleY: number;
        corners: DOMPoint[];
    } | null,
) {
    if (a === b) return true;
    if (!a || !b) return false;
    if (
        a.x !== b.x ||
        a.y !== b.y ||
        a.width !== b.width ||
        a.height !== b.height ||
        a.hasTransform !== b.hasTransform ||
        a.selfTransformed !== b.selfTransformed ||
        a.cssTransform !== b.cssTransform ||
        a.scaleX !== b.scaleX ||
        a.scaleY !== b.scaleY
    ) {
        return false;
    }
    if (a.corners.length !== b.corners.length) return false;
    for (let i = 0; i < a.corners.length; i += 1) {
        const left = a.corners[i];
        const right = b.corners[i];
        if (!left || !right || left.x !== right.x || left.y !== right.y) {
            return false;
        }
    }
    return true;
}

export function trackNodeRect(
    nodeId: number,
    bridge: ResponsiveBridgeLike | null,
    onRect: (
        rect:
            | {
                  x: number;
                  y: number;
                  width: number;
                  height: number;
                  hasTransform: boolean;
                  selfTransformed: boolean;
                  cssTransform: string;
                  scaleX: number;
                  scaleY: number;
                  corners: DOMPoint[];
              }
            | null,
    ) => void,
) {
    let active = true;
    let last: Parameters<typeof onRect>[0] = null;
    let initial = true;

    function emit(nextRect: Parameters<typeof onRect>[0]) {
        if (!initial && rectsEqual(last, nextRect)) {
            return;
        }
        initial = false;
        last = nextRect;
        onRect(nextRect);
    }

    function tick() {
        if (!active) {
            return;
        }

        if (useStore.getState().responsiveMode && bridge?.getHostElementQuad) {
            void bridge
                .getHostElementQuad(nodeId)
                .then((rect) => {
                    if (!active) {
                        return;
                    }
                    emit(rect ?? null);
                })
                .catch(() => {
                    if (active) {
                        emit(null);
                    }
                });
        } else {
            const element = getElement(nodeId);
            if (element && element.isConnected) {
                const quad = getElementQuad(element);
                emit({
                    x: quad.untransformedX,
                    y: quad.untransformedY,
                    width: quad.width,
                    height: quad.height,
                    hasTransform: quad.hasTransform,
                    selfTransformed: quad.selfTransformed,
                    cssTransform: quad.cssTransform,
                    scaleX: quad.scaleX,
                    scaleY: quad.scaleY,
                    corners: quad.corners,
                });
            } else {
                emit(null);
            }
        }

        frame.read(tick, true);
    }

    frame.read(tick, true);

    return () => {
        active = false;
        cancelFrame(tick);
    };
}
