import { BLOCK_TAGS } from './html-tags';

const ZWSP = '\u200B';

function stripZwsp(value: string) {
    return value.replace(/\u200B/g, '');
}

const INLINE: Record<
    string,
    (inner: string, el?: Element) => string
> = {
    strong: (inner) => `**${inner}**`,
    b: (inner) => `**${inner}**`,
    em: (inner) => `*${inner}*`,
    i: (inner) => `*${inner}*`,
    code: (inner) => `\`${inner}\``,
    del: (inner) => `~~${inner}~~`,
    s: (inner) => `~~${inner}~~`,
    a: (inner, el) => {
        const href = el?.getAttribute('href') ?? '';
        return href ? `[${inner}](${href})` : inner;
    },
    br: () => '  \n',
};

function serializeInline(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
        return stripZwsp(node.textContent ?? '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
    }

    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    let inner = '';
    for (let i = 0; i < el.childNodes.length; i += 1) {
        const child = el.childNodes[i];
        if (child) {
            inner += serializeInline(child);
        }
    }

    const handler = INLINE[tag];
    return handler ? handler(inner, el) : inner;
}

function serializeContainer(el: Element): string {
    let out = '';
    let inlineBuffer = '';
    let sawBlock = false;

    for (let i = 0; i < el.childNodes.length; i += 1) {
        const child = el.childNodes[i];
        if (child?.nodeType === Node.ELEMENT_NODE) {
            const childEl = child as Element;
            if (BLOCK_TAGS.has(childEl.tagName.toLowerCase())) {
                if (inlineBuffer.trim()) {
                    out += `${inlineBuffer.trim()}\n\n`;
                }
                inlineBuffer = '';
                sawBlock = true;
                out += serializeBlock(childEl);
                continue;
            }
        }

        if (child) {
            inlineBuffer += serializeInline(child);
        }
    }

    if (!sawBlock) {
        const text = inlineBuffer.trim();
        return text ? `${text}\n\n` : '';
    }

    if (inlineBuffer.trim()) {
        out += `${inlineBuffer.trim()}\n\n`;
    }

    return out;
}

function serializeBlock(el: Element): string {
    const tag = el.tagName.toLowerCase();
    switch (tag) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6': {
            const level = Number(tag[1] ?? '1');
            return `${'#'.repeat(level)} ${serializeInline(el).trim()}\n\n`;
        }
        case 'p':
            return `${serializeInline(el).trim()}\n\n`;
        case 'blockquote': {
            const body = serializeContainer(el).trim();
            return (
                body
                    .split('\n')
                    .map((line) => (line ? `> ${line}` : '>'))
                    .join('\n') + '\n\n'
            );
        }
        case 'ul':
        case 'ol': {
            let out = '';
            let itemIndex = 0;
            for (let i = 0; i < el.children.length; i += 1) {
                const li = el.children[i];
                if (!li || li.tagName.toLowerCase() !== 'li') {
                    continue;
                }
                const marker = tag === 'ol' ? `${itemIndex + 1}. ` : '- ';
                out += `${itemIndex ? '\n' : ''}${marker}${serializeInline(li).trim()}`;
                itemIndex += 1;
            }
            return `${out}\n\n`;
        }
        case 'pre': {
            const code = el.querySelector('code');
            const inner = (code ?? el).textContent ?? '';
            return `\`\`\`\n${inner.replace(/\n$/, '')}\n\`\`\`\n\n`;
        }
        case 'hr':
            return '---\n\n';
        default:
            return serializeContainer(el);
    }
}

export function domToMarkdown(root: Element): string {
    const tag = root.tagName.toLowerCase();
    const raw = BLOCK_TAGS.has(tag) ? serializeBlock(root) : serializeContainer(root);
    return stripZwsp(raw).replace(/\n{3,}/g, '\n\n').trim();
}
