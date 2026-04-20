export interface TransformFn {
    name: string;
    args: string;
}

export function parseTransformFunctions(value: string): TransformFn[] {
    if (!value || value === 'none') return [];
    const fns: TransformFn[] = [];
    let i = 0;
    while (i < value.length) {
        while (i < value.length && /\s/.test(value[i])) i++;
        if (i >= value.length) break;
        const nameStart = i;
        while (i < value.length && /[\w-]/.test(value[i])) i++;
        const name = value.slice(nameStart, i);
        if (!name) break;
        while (i < value.length && /\s/.test(value[i])) i++;
        if (value[i] !== '(') break;
        i++;
        let depth = 1;
        const argsStart = i;
        while (i < value.length && depth > 0) {
            if (value[i] === '(') depth++;
            else if (value[i] === ')') depth--;
            if (depth > 0) i++;
        }
        fns.push({ name, args: value.slice(argsStart, i).trim() });
        i++;
    }
    return fns;
}

export function hasMatrixTransform(value: string): boolean {
    return /matrix3?d?\s*\(/.test(value);
}

export function extractTranslateXY(fns: TransformFn[]): { x: string; y: string } {
    let x = '';
    let y = '';
    for (const fn of fns) {
        if (fn.name === 'translate') {
            const parts = fn.args.split(',').map((s) => s.trim());
            x = parts[0] || '';
            y = parts[1] || '';
        } else if (fn.name === 'translateX') {
            x = fn.args;
        } else if (fn.name === 'translateY') {
            y = fn.args;
        }
    }
    return { x, y };
}

export function extractTransformValue(fns: TransformFn[], name: string): string {
    return fns.find((f) => f.name === name)?.args ?? '';
}

const HANDLED = new Set(['translateX', 'translateY', 'translate', 'rotate', 'scaleX', 'scaleY', 'scale', 'skewX', 'skewY']);

export function getOtherFunctions(fns: TransformFn[]): TransformFn[] {
    return fns.filter((f) => !HANDLED.has(f.name));
}

function isZeroValue(value: string): boolean {
    if (!value) return true;
    const match = value.match(/^(-?[\d.]+)/);
    return match ? parseFloat(match[1]) === 0 : false;
}

function isOneValue(value: string): boolean {
    if (!value) return true;
    const match = value.match(/^(-?[\d.]+)/);
    return match ? parseFloat(match[1]) === 1 : false;
}

export function extractScaleXY(fns: TransformFn[]): { sx: string; sy: string } {
    let sx = '';
    let sy = '';
    for (const fn of fns) {
        if (fn.name === 'scale') {
            const parts = fn.args.split(',').map((s) => s.trim());
            sx = parts[0] || '';
            sy = parts[1] || sx;
        } else if (fn.name === 'scaleX') {
            sx = fn.args;
        } else if (fn.name === 'scaleY') {
            sy = fn.args;
        }
    }
    return { sx, sy };
}

export function composeTransform(values: {
    translateX: string;
    translateY: string;
    rotate: string;
    scaleX: string;
    scaleY: string;
    skewX: string;
    skewY: string;
    other: TransformFn[];
}): string {
    const parts: string[] = [];
    if (!isZeroValue(values.translateX)) parts.push(`translateX(${values.translateX})`);
    if (!isZeroValue(values.translateY)) parts.push(`translateY(${values.translateY})`);
    if (!isZeroValue(values.rotate)) parts.push(`rotate(${values.rotate})`);
    if (!isOneValue(values.scaleX)) parts.push(`scaleX(${values.scaleX})`);
    if (!isOneValue(values.scaleY)) parts.push(`scaleY(${values.scaleY})`);
    if (!isZeroValue(values.skewX)) parts.push(`skewX(${values.skewX})`);
    if (!isZeroValue(values.skewY)) parts.push(`skewY(${values.skewY})`);
    for (const fn of values.other) {
        parts.push(`${fn.name}(${fn.args})`);
    }
    return parts.join(' ');
}
