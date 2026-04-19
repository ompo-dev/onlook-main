export const SHORTHAND_CONFIGS: [string, string[]][] = [
    ['padding', ['padding-top', 'padding-right', 'padding-bottom', 'padding-left']],
    ['margin', ['margin-top', 'margin-right', 'margin-bottom', 'margin-left']],
    ['gap', ['row-gap', 'column-gap']],
    ['border-radius', ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius']],
    ['overflow', ['overflow-x', 'overflow-y']],
    ['corner-shape', ['corner-shape-top-left', 'corner-shape-top-right', 'corner-shape-bottom-right', 'corner-shape-bottom-left']],
];

export function synthesizeShorthand(
    styles: Record<string, string>,
    shorthand: string,
    longhands: string[],
): void {
    if (styles[shorthand]) return;
    const values = longhands.map((lh) => styles[lh]);
    if (values.some((v) => !v)) return;
    if (longhands.length === 4) {
        const [top, right, bottom, left] = values;
        if (top === right && right === bottom && bottom === left) {
            styles[shorthand] = top;
        } else if (top === bottom && right === left) {
            styles[shorthand] = `${top} ${right}`;
        } else if (right === left) {
            styles[shorthand] = `${top} ${right} ${bottom}`;
        } else {
            styles[shorthand] = values.join(' ');
        }
    } else if (longhands.length === 2) {
        const [a, b] = values;
        styles[shorthand] = a === b ? a : `${a} ${b}`;
    }
}

export function synthesizeBorderShorthand(styles: Record<string, string>): void {
    const SIDES = ['top', 'right', 'bottom', 'left'];
    const PARTS = ['width', 'style', 'color'];
    for (const side of SIDES) {
        const key = `border-${side}`;
        if (!styles[key]) {
            const w = styles[`${key}-width`];
            const s = styles[`${key}-style`];
            const c = styles[`${key}-color`];
            if (w && s && c) styles[key] = `${w} ${s} ${c}`;
        }
    }
    if (styles['border']) return;
    const topValues = PARTS.map((p) => styles[`border-top-${p}`]);
    if (topValues.some((v) => !v)) return;
    const allMatch = SIDES.every((side) =>
        PARTS.every((p) => styles[`border-${side}-${p}`] === styles[`border-top-${p}`]),
    );
    if (allMatch) {
        styles['border'] = topValues.join(' ');
    }
}
