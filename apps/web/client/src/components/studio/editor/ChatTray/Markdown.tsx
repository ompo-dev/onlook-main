'use client';

import { Fragment } from 'react';

type MarkdownBlock =
    | { type: 'heading'; level: number; text: string }
    | { type: 'code'; lang?: string; content: string }
    | { type: 'ul' | 'ol'; items: string[] }
    | { type: 'paragraph'; text: string };

function isBlockStart(line: string) {
    return (
        /^```/.test(line) ||
        /^#{1,6}\s/.test(line) ||
        /^\s*[-*]\s/.test(line) ||
        /^\s*\d+\.\s/.test(line)
    );
}

function parseBlocks(src: string): MarkdownBlock[] {
    const lines = src.replace(/\r\n?/g, '\n').split('\n');
    const blocks: MarkdownBlock[] = [];
    let index = 0;

    while (index < lines.length) {
        const line = lines[index] ?? '';
        const fence = /^```(\w*)\s*$/.exec(line);
        if (fence) {
            const lang = fence[1] || undefined;
            const code: string[] = [];
            index += 1;
            while (index < lines.length && !/^```\s*$/.test(lines[index] ?? '')) {
                code.push(lines[index] ?? '');
                index += 1;
            }
            if (index < lines.length) {
                index += 1;
            }
            blocks.push({ type: 'code', lang, content: code.join('\n') });
            continue;
        }

        if (!line.trim()) {
            index += 1;
            continue;
        }

        const heading = /^(#{1,6})\s+(.*)$/.exec(line);
        if (heading) {
            blocks.push({
                type: 'heading',
                level: heading[1]?.length ?? 1,
                text: heading[2] ?? '',
            });
            index += 1;
            continue;
        }

        if (/^\s*[-*]\s+/.test(line)) {
            const items: string[] = [];
            while (index < lines.length && /^\s*[-*]\s+/.test(lines[index] ?? '')) {
                items.push((lines[index] ?? '').replace(/^\s*[-*]\s+/, ''));
                index += 1;
            }
            blocks.push({ type: 'ul', items });
            continue;
        }

        if (/^\s*\d+\.\s+/.test(line)) {
            const items: string[] = [];
            while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index] ?? '')) {
                items.push((lines[index] ?? '').replace(/^\s*\d+\.\s+/, ''));
                index += 1;
            }
            blocks.push({ type: 'ol', items });
            continue;
        }

        const paragraph = [line];
        index += 1;
        while (
            index < lines.length &&
            (lines[index] ?? '').trim() &&
            !isBlockStart(lines[index] ?? '')
        ) {
            paragraph.push(lines[index] ?? '');
            index += 1;
        }
        blocks.push({ type: 'paragraph', text: paragraph.join('\n') });
    }

    return blocks;
}

const INLINE_RE =
    /(`[^`\n]+`)|(\[[^\]]+\]\([^)\s]+\))|(\*\*[^*\n]+\*\*|__[^_\n]+__)|(\*[^*\s][^*\n]*\*|_[^_\s][^_\n]*_)/g;

function safeHref(href: string) {
    return /^(https?:|mailto:|\/|#)/i.test(href) ? href : '#';
}

function renderInline(text: string, keyPrefix = '') {
    const nodes: Array<string | React.ReactNode> = [];
    let lastIndex = 0;
    let key = 0;
    const re = new RegExp(INLINE_RE.source, 'g');
    let match: RegExpExecArray | null;

    while ((match = re.exec(text))) {
        if (match.index > lastIndex) {
            nodes.push(text.slice(lastIndex, match.index));
        }
        const token = match[0];
        const reactKey = `${keyPrefix}${key++}`;
        if (token.startsWith('`')) {
            nodes.push(<code key={reactKey}>{token.slice(1, -1)}</code>);
        } else if (token.startsWith('[')) {
            const linkMatch = /\[([^\]]+)\]\(([^)\s]+)\)/.exec(token);
            if (linkMatch) {
                nodes.push(
                    <a
                        key={reactKey}
                        href={safeHref(linkMatch[2] ?? '#')}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {linkMatch[1]}
                    </a>,
                );
            } else {
                nodes.push(token);
            }
        } else if (token.startsWith('**') || token.startsWith('__')) {
            nodes.push(<strong key={reactKey}>{token.slice(2, -2)}</strong>);
        } else {
            nodes.push(<em key={reactKey}>{token.slice(1, -1)}</em>);
        }
        lastIndex = re.lastIndex;
    }

    if (lastIndex < text.length) {
        nodes.push(text.slice(lastIndex));
    }

    return nodes;
}

function renderParagraph(text: string) {
    const lines = text.split('\n');
    const out: Array<string | React.ReactNode> = [];
    lines.forEach((line, index) => {
        if (index > 0) {
            out.push(<br key={`br-${index}`} />);
        }
        out.push(...renderInline(line, `p${index}-`));
    });
    return out;
}

function renderBlock(block: MarkdownBlock, index: number) {
    switch (block.type) {
        case 'heading': {
            const level = Math.min(Math.max(block.level, 1), 6);
            const children = renderInline(block.text);
            if (level === 1) return <h1 key={index}>{children}</h1>;
            if (level === 2) return <h2 key={index}>{children}</h2>;
            if (level === 3) return <h3 key={index}>{children}</h3>;
            if (level === 4) return <h4 key={index}>{children}</h4>;
            if (level === 5) return <h5 key={index}>{children}</h5>;
            return <h6 key={index}>{children}</h6>;
        }
        case 'code':
            return (
                <pre key={index}>
                    <code>{block.content}</code>
                </pre>
            );
        case 'ul':
            return (
                <ul key={index}>
                    {block.items.map((item, itemIndex) => (
                        <li key={itemIndex}>{renderInline(item)}</li>
                    ))}
                </ul>
            );
        case 'ol':
            return (
                <ol key={index}>
                    {block.items.map((item, itemIndex) => (
                        <li key={itemIndex}>{renderInline(item)}</li>
                    ))}
                </ol>
            );
        case 'paragraph':
            return <p key={index}>{renderParagraph(block.text)}</p>;
    }
}

export function Markdown({ text }: { text: string }) {
    const blocks = parseBlocks(text);
    return <Fragment>{blocks.map((block, index) => renderBlock(block, index))}</Fragment>;
}
