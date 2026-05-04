import { SHORTHAND_CONFIGS, synthesizeBorderShorthand, synthesizeShorthand } from './css-shorthand';

const AUTO_DEFAULT_PROPS = [
    'width',
    'height',
    'min-width',
    'min-height',
    'top',
    'right',
    'bottom',
    'left',
] as const;

interface MatchedRule {
    selector: string;
    properties: Record<string, string>;
}

interface ProcessStyleResultInput {
    computed?: Record<string, string>;
    matched?: MatchedRule[];
    inline?: Record<string, string>;
    parentDisplay?: string;
}

export function processStyleResult(
    result: ProcessStyleResultInput,
    userEdits: Record<string, string>,
) {
    const properties: Array<{
        name: string;
        value: string;
        source: 'inline' | 'matched';
        selector?: string;
    }> = [];
    const computed = result.computed ?? {};
    const authored: Record<string, string> = {};

    if (result.matched) {
        for (const rule of result.matched) {
            for (const [name, value] of Object.entries(rule.properties)) {
                if (!value) {
                    continue;
                }

                properties.push({ name, value, source: 'matched', selector: rule.selector });
                const existing = authored[name];
                const computedValue = computed[name];
                if (
                    existing !== undefined &&
                    computedValue &&
                    existing === computedValue &&
                    value !== computedValue
                ) {
                    continue;
                }
                authored[name] = value;
            }
        }
    }

    if (result.inline) {
        for (const [name, value] of Object.entries(result.inline)) {
            if (!value) {
                continue;
            }
            authored[name] = value;
            properties.push({ name, value, source: 'inline' });
        }
    }

    const display = { ...computed, ...authored };

    for (const prop of AUTO_DEFAULT_PROPS) {
        if (!authored[prop] && display[prop]) {
            display[prop] = 'auto';
        }
    }

    for (const [shorthand, longhands] of SHORTHAND_CONFIGS) {
        synthesizeShorthand(display, shorthand, longhands);
    }

    synthesizeBorderShorthand(display);

    for (const [prop, value] of Object.entries(userEdits)) {
        if (authored[prop] === value) {
            delete userEdits[prop];
        } else {
            display[prop] = value;
        }
    }

    return {
        properties,
        display,
        parentDisplay: result.parentDisplay ?? '',
    };
}
