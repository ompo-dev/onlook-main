const ZWSP = '\u200B';

type ShortcutMatch = RegExpMatchArray;

interface ShortcutPattern {
    re: RegExp;
    tag: string;
    inner: (match: ShortcutMatch) => string;
    fullLength: (match: ShortcutMatch) => number;
    attrs?: (match: ShortcutMatch) => Record<string, string>;
}

const PATTERNS: ShortcutPattern[] = [
    {
        re: /\[([^\]\n]+)\]\(([^)\n]+)\)$/,
        tag: 'a',
        inner: (match) => match[1] ?? '',
        fullLength: (match) => match[0].length,
        attrs: (match) => ({ href: match[2] ?? '' }),
    },
    {
        re: /\*\*([^*\n]+?)\*\*$/,
        tag: 'strong',
        inner: (match) => match[1] ?? '',
        fullLength: (match) => match[0].length,
    },
    {
        re: /~~([^~\n]+?)~~$/,
        tag: 'del',
        inner: (match) => match[1] ?? '',
        fullLength: (match) => match[0].length,
    },
    {
        re: /(^|[^*])(\*[^*\n]+?\*)$/,
        tag: 'em',
        inner: (match) => (match[2] ?? '').slice(1, -1),
        fullLength: (match) => (match[2] ?? '').length,
    },
    {
        re: /`([^`\n]+?)`$/,
        tag: 'code',
        inner: (match) => match[1] ?? '',
        fullLength: (match) => match[0].length,
    },
];

function isInsideCodeBlock(node: Node | null) {
    if (!node) return false;
    const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
    return !!el?.closest?.('code, pre');
}

function firstNonWhitespaceTextNode(root: Element) {
    const walker = (root.ownerDocument ?? document).createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
        const current = walker.currentNode;
        if ((current.textContent ?? '').trim().length > 0) {
            return current as Text;
        }
    }
    return null;
}

function applyShortcut(
    textNode: Text,
    end: number,
    pattern: ShortcutPattern,
    match: ShortcutMatch,
) {
    const text = textNode.textContent ?? '';
    const matchLength = pattern.fullLength(match);
    const start = end - matchLength;
    if (start < 0) return false;

    const beforeText = text.slice(0, start);
    const afterText = text.slice(end);
    const parent = textNode.parentNode;
    if (!parent) return false;

    const wrap = document.createElement(pattern.tag);
    wrap.textContent = pattern.inner(match);
    if (pattern.attrs) {
        for (const [key, value] of Object.entries(pattern.attrs(match))) {
            wrap.setAttribute(key, value);
        }
    }

    if (beforeText) {
        parent.insertBefore(document.createTextNode(beforeText), textNode);
    }
    parent.insertBefore(wrap, textNode);

    const afterNode = document.createTextNode(afterText || ZWSP);
    parent.insertBefore(afterNode, textNode);
    parent.removeChild(textNode);

    const selection = (textNode.ownerDocument ?? document).getSelection?.();
    if (selection) {
        const range = (textNode.ownerDocument ?? document).createRange();
        range.setStart(afterNode, 0);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    return true;
}

const HEADING_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, div';
const LIST_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, div, li';

function closestBlock(node: Node, selector: string) {
    const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
    return el?.closest?.(selector) ?? null;
}

function placeCaretAtStart(textNode: Text) {
    const doc = textNode.ownerDocument ?? document;
    const selection = doc.getSelection?.();
    if (!selection) return;
    const range = doc.createRange();
    range.setStart(textNode, 0);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
}

function matchAtBlockStart(textNode: Text, caretOffset: number, re: RegExp) {
    const before = (textNode.textContent ?? '').slice(0, caretOffset).replace(/\u00A0/g, ' ');
    const trimmedStart = before.replace(/^\s+/, '');
    const match = trimmedStart.match(re);
    if (!match) return null;
    return {
        match,
        stripLen: before.length - trimmedStart.length + match[0].length,
    };
}

function tryHeading(textNode: Text, caretOffset: number) {
    const hit = matchAtBlockStart(textNode, caretOffset, /^(#{1,6}) $/);
    if (!hit) return false;

    const block = closestBlock(textNode, HEADING_SELECTOR);
    if (!block) return false;
    if (firstNonWhitespaceTextNode(block) !== textNode) return false;

    textNode.textContent = (textNode.textContent ?? '').slice(hit.stripLen);
    const nextTag = `h${hit.match[1]?.length ?? 1}`;
    if (block.tagName.toLowerCase() !== nextTag) {
        const doc = block.ownerDocument ?? document;
        const newBlock = doc.createElement(nextTag);
        while (block.firstChild) {
            newBlock.appendChild(block.firstChild);
        }
        block.parentNode?.replaceChild(newBlock, block);
    }
    placeCaretAtStart(textNode);
    return true;
}

function tryList(textNode: Text, caretOffset: number) {
    const ulHit = matchAtBlockStart(textNode, caretOffset, /^- $/);
    const olHit = ulHit ? null : matchAtBlockStart(textNode, caretOffset, /^\d+\. $/);
    const hit = ulHit ?? olHit;
    if (!hit) return false;

    const listTag = ulHit ? 'ul' : 'ol';
    const block = closestBlock(textNode, LIST_SELECTOR);
    if (!block) return false;
    if (firstNonWhitespaceTextNode(block) !== textNode) return false;

    textNode.textContent = (textNode.textContent ?? '').slice(hit.stripLen);
    const doc = block.ownerDocument ?? document;
    if (block.tagName.toLowerCase() === 'li') {
        const parent = block.parentElement;
        if (parent && parent.tagName.toLowerCase() !== listTag) {
            const newParent = doc.createElement(listTag);
            while (parent.firstChild) {
                newParent.appendChild(parent.firstChild);
            }
            parent.parentNode?.replaceChild(newParent, parent);
        }
    } else {
        const newList = doc.createElement(listTag);
        const newItem = doc.createElement('li');
        while (block.firstChild) {
            newItem.appendChild(block.firstChild);
        }
        newList.appendChild(newItem);
        block.parentNode?.replaceChild(newList, block);
    }

    placeCaretAtStart(textNode);
    return true;
}

function tryApplyBlockShortcut() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return false;

    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return false;
    const textNode = node as Text;
    if (isInsideCodeBlock(textNode)) return false;

    if (tryHeading(textNode, range.startOffset)) return true;
    if (tryList(textNode, range.startOffset)) return true;
    return false;
}

function tryApplyInlineShortcut() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return false;

    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return false;
    if (isInsideCodeBlock(node)) return false;

    const textNode = node as Text;
    const offset = range.startOffset;
    const before = (textNode.textContent ?? '').slice(0, offset);
    for (const pattern of PATTERNS) {
        const match = before.match(pattern.re);
        if (match) {
            return applyShortcut(textNode, offset, pattern, match);
        }
    }
    return false;
}

const SHORTCUT_TRIGGER_CHARS = new Set([' ', ')', '*', '~', '`']);

export function installInlineMarkdownShortcuts(el: HTMLElement) {
    function onInput(event: Event) {
        const inputEvent = event as InputEvent;
        if (inputEvent.inputType && inputEvent.inputType !== 'insertText') return;
        if (inputEvent.data && !SHORTCUT_TRIGGER_CHARS.has(inputEvent.data)) return;
        if (tryApplyBlockShortcut()) return;
        tryApplyInlineShortcut();
    }

    el.addEventListener('input', onInput);
    return () => el.removeEventListener('input', onInput);
}
