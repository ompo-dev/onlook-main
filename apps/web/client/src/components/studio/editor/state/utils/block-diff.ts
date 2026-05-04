import { getId } from '../dom-bridge';
import { LEAF_BLOCK_TAGS } from './html-tags';
import { domToMarkdown } from './dom-to-markdown';

const PRECEDING_WORDS = 5;

export interface BlockDiff {
    nodeId: number;
    tag: string;
    from: string;
    to: string;
    precedingText?: string;
}

interface BlockSnapshot {
    el: Element;
    tag: string;
    markdown: string;
}

function lastWords(markdown: string, count: number) {
    const words = markdown.trim().split(/\s+/).filter(Boolean);
    return words.slice(-count).join(' ');
}

function directTextMarkdown(el: Element) {
    let out = '';
    for (let i = 0; i < el.childNodes.length; i += 1) {
        const child = el.childNodes[i];
        if (child?.nodeType === Node.TEXT_NODE) {
            out += child.textContent ?? '';
        }
    }
    return out.trim();
}

function walkBlocks(el: Element, out: BlockSnapshot[]) {
    for (let i = 0; i < el.children.length; i += 1) {
        const child = el.children[i];
        if (!child) continue;
        const tag = child.tagName.toLowerCase();
        if (LEAF_BLOCK_TAGS.has(tag)) {
            const markdown = domToMarkdown(child);
            if (markdown) {
                out.push({ el: child, tag, markdown });
            }
        } else {
            walkBlocks(child, out);
        }
    }
}

function collectBlocks(root: Element): BlockSnapshot[] {
    const tag = root.localName;
    if (LEAF_BLOCK_TAGS.has(tag)) {
        const markdown = domToMarkdown(root);
        return markdown ? [{ el: root, tag, markdown }] : [];
    }

    const out: BlockSnapshot[] = [];
    const looseText = directTextMarkdown(root);
    if (looseText) {
        out.push({ el: root, tag, markdown: looseText });
    }
    walkBlocks(root, out);
    return out;
}

function parseBeforeRoot(rootEl: Element, originalHTML: string) {
    const before = rootEl.ownerDocument.createElement(rootEl.localName);
    before.innerHTML = originalHTML;
    return before;
}

export function diffBlocks(rootEl: Element, originalHTML: string): BlockDiff[] {
    const beforeRoot = parseBeforeRoot(rootEl, originalHTML);
    const before = collectBlocks(beforeRoot);
    const after = collectBlocks(rootEl);

    const afterByMarkdown = new Map<string, number[]>();
    for (let index = 0; index < after.length; index += 1) {
        const block = after[index];
        if (!block) continue;
        const list = afterByMarkdown.get(block.markdown);
        if (list) {
            list.push(index);
        } else {
            afterByMarkdown.set(block.markdown, [index]);
        }
    }

    const beforeMatched = new Set<number>();
    const afterMatched = new Set<number>();
    for (let beforeIndex = 0; beforeIndex < before.length; beforeIndex += 1) {
        const block = before[beforeIndex];
        if (!block) continue;
        const candidates = afterByMarkdown.get(block.markdown);
        if (!candidates) continue;
        for (const afterIndex of candidates) {
            if (afterMatched.has(afterIndex)) continue;
            beforeMatched.add(beforeIndex);
            afterMatched.add(afterIndex);
            break;
        }
    }

    const leftBefore = before
        .map((block, index) => ({ block, index }))
        .filter(({ index }) => !beforeMatched.has(index));
    const leftAfter = after
        .map((block, index) => ({ block, index }))
        .filter(({ index }) => !afterMatched.has(index));

    const diffs: BlockDiff[] = [];
    const rootId = getId(rootEl);
    const max = Math.max(leftBefore.length, leftAfter.length);

    for (let i = 0; i < max; i += 1) {
        const beforeItem = leftBefore[i];
        const afterItem = leftAfter[i];
        if (beforeItem && afterItem) {
            diffs.push({
                nodeId: getId(afterItem.block.el),
                tag: afterItem.block.tag,
                from: beforeItem.block.markdown,
                to: afterItem.block.markdown,
            });
            continue;
        }

        if (afterItem) {
            const diff: BlockDiff = {
                nodeId: getId(afterItem.block.el),
                tag: afterItem.block.tag,
                from: '',
                to: afterItem.block.markdown,
            };
            if (afterItem.block.el !== rootEl) {
                const prev = afterItem.index > 0 ? after[afterItem.index - 1] : undefined;
                if (prev) {
                    const anchor = lastWords(prev.markdown, PRECEDING_WORDS);
                    if (anchor) {
                        diff.precedingText = anchor;
                    }
                }
            }
            diffs.push(diff);
            continue;
        }

        if (beforeItem) {
            const diff: BlockDiff = {
                nodeId: rootId,
                tag: rootEl.localName,
                from: beforeItem.block.markdown,
                to: '',
            };
            const prev = beforeItem.index > 0 ? before[beforeItem.index - 1] : undefined;
            if (prev) {
                const anchor = lastWords(prev.markdown, PRECEDING_WORDS);
                if (anchor) {
                    diff.precedingText = anchor;
                }
            }
            diffs.push(diff);
        }
    }

    return diffs;
}
