'use client';

import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
import { EditorAttributes } from '@onlook/constants';
import type { Font, SystemTheme } from '@onlook/models/assets';
import {
    ChatType,
    EditorMode,
    type ActionElement,
    type DomElement,
    type LayerNode,
    type PageMetadata,
    type PageNode,
} from '@onlook/models';
import { Color, createDomId, createOid, getBaseName, isImageFile } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import {
    ChevronDown,
    ChevronRight,
    CircleGauge,
    Copy,
    FileCode2,
    FileImage,
    Layers3,
    MessageSquareText,
    Paintbrush2,
    PanelBottom,
    PanelLeft,
    PanelRight,
    RefreshCcw,
    ScanSearch,
    Send,
    Settings2,
    Sparkles,
    Trash2,
    Type,
} from 'lucide-react';
import {
    type CSSProperties,
    type ReactNode,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useNativeStudioStore, type NativeInspectorTab, type NativeNavigatorTab } from './native-store';
import { updateNativeStudioSettings, useStudioRuntime } from './runtime';

const STUDIO_STYLES = `
:host {
    color-scheme: dark;
}

*,
*::before,
*::after {
    box-sizing: border-box;
}

.studio-root {
    position: absolute;
    inset: 0;
    z-index: 60;
    pointer-events: none;
    font-family: Inter, system-ui, sans-serif;
    color: var(--cs-foreground);
}

.studio-toolbar {
    position: absolute;
    top: 56px;
    right: 16px;
    display: flex;
    align-items: center;
    gap: 4px;
    border: 1px solid var(--cs-border);
    border-radius: 10px;
    padding: 4px;
    background: var(--cs-layer);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
    pointer-events: auto;
}

.studio-panel {
    position: absolute;
    border: 1px solid var(--cs-border);
    border-radius: 12px;
    background: var(--cs-layer);
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
    pointer-events: auto;
    backdrop-filter: blur(16px);
}

.studio-panel.left {
    top: 56px;
    left: 16px;
    width: 320px;
    bottom: 272px;
}

.studio-panel.right {
    top: 56px;
    right: 16px;
    width: 340px;
    bottom: 272px;
}

.studio-panel.bottom {
    left: 50%;
    right: 16px;
    bottom: 16px;
    height: 240px;
    transform: translateX(-8px);
}

.studio-panel-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    border-bottom: 1px solid var(--cs-border);
    background: rgba(0, 0, 0, 0.08);
}

.studio-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--cs-secondary-text);
}

.studio-tab-row {
    display: flex;
    gap: 4px;
    margin-left: auto;
}

.studio-tab,
.studio-button,
.studio-icon-button,
.studio-segment-button {
    border: 0;
    color: inherit;
    background: transparent;
    font: inherit;
}

.studio-tab {
    border-radius: 6px;
    padding: 5px 8px;
    font-size: 11px;
    color: var(--cs-secondary-text);
    cursor: pointer;
}

.studio-tab.active {
    background: color-mix(in srgb, var(--cs-accent) 12%, transparent);
    color: var(--cs-accent);
}

.studio-icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 7px;
    color: var(--cs-foreground);
    cursor: pointer;
}

.studio-icon-button:hover,
.studio-button:hover,
.studio-segment-button:hover {
    background: rgba(255, 255, 255, 0.06);
}

.studio-icon-button.active {
    color: var(--cs-accent);
    background: color-mix(in srgb, var(--cs-accent) 12%, transparent);
}

.studio-panel-content {
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: calc(100% - 42px);
    padding: 12px;
    overflow: auto;
}

.studio-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.studio-section-title {
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--cs-secondary-text);
    font-weight: 600;
}

.studio-row {
    display: grid;
    grid-template-columns: 90px 1fr;
    gap: 8px;
    align-items: center;
}

.studio-input,
.studio-textarea,
.studio-select {
    width: 100%;
    border-radius: 7px;
    border: 1px solid var(--cs-border);
    background: var(--cs-input-bg);
    color: var(--cs-foreground);
    padding: 7px 9px;
    font-size: 12px;
    outline: none;
}

.studio-input:focus,
.studio-textarea:focus,
.studio-select:focus {
    border-color: var(--cs-accent);
}

.studio-textarea {
    resize: vertical;
    min-height: 72px;
}

.studio-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 7px;
    border: 1px solid var(--cs-border);
    background: var(--cs-input-bg);
    color: var(--cs-foreground);
    padding: 8px 10px;
    cursor: pointer;
    font-size: 12px;
}

.studio-button.primary {
    background: var(--cs-accent);
    color: var(--cs-on-accent);
    border-color: transparent;
}

.studio-button.danger {
    color: #ff9ca6;
}

.studio-inline-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.studio-tree {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.studio-tree-row {
    display: flex;
    align-items: center;
    gap: 6px;
    border-radius: 6px;
    padding: 4px 6px;
    color: var(--cs-foreground);
    cursor: pointer;
    font-size: 12px;
}

.studio-tree-row:hover {
    background: rgba(255, 255, 255, 0.04);
}

.studio-tree-row.active {
    background: color-mix(in srgb, var(--cs-accent) 12%, transparent);
    color: var(--cs-accent);
}

.studio-tree-chevron {
    width: 14px;
    height: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--cs-secondary-text);
    flex-shrink: 0;
}

.studio-tree-spacer {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
}

.studio-tree-tag {
    color: var(--cs-accent);
}

.studio-tree-meta {
    color: var(--cs-secondary-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.studio-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 8px;
}

.studio-swatch {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.studio-swatch-color {
    width: 100%;
    height: 36px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.08);
}

.studio-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border-radius: 999px;
    padding: 4px 8px;
    background: rgba(255, 255, 255, 0.05);
    color: var(--cs-secondary-text);
    font-size: 11px;
}

.studio-scroll-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.studio-slider {
    width: 100%;
}

.studio-timeline-row {
    display: grid;
    grid-template-columns: 110px 1fr;
    gap: 10px;
    align-items: center;
}

.studio-divider {
    height: 1px;
    background: var(--cs-border);
}

.studio-message {
    padding: 8px 10px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.04);
    font-size: 12px;
    line-height: 1.45;
}

.studio-message.user {
    background: color-mix(in srgb, var(--cs-accent) 18%, transparent);
}

.studio-muted {
    color: var(--cs-secondary-text);
}

.studio-settings-popover {
    position: absolute;
    top: 40px;
    right: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 240px;
    border: 1px solid var(--cs-border);
    border-radius: 10px;
    padding: 12px;
    background: var(--cs-black);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
}

.studio-segment {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    padding: 2px;
}

.studio-segment-button {
    border-radius: 6px;
    padding: 5px 8px;
    color: var(--cs-secondary-text);
    cursor: pointer;
    font-size: 11px;
}

.studio-segment-button.active {
    background: rgba(255, 255, 255, 0.08);
    color: var(--cs-foreground);
}
`;

const ACCENT_COLORS = {
    amber: '#fbbf24',
    emerald: '#34d399',
    indigo: '#8df0cc',
    ocean: '#38bdf8',
    rose: '#fb7185',
} as const;

const TEXT_TAGS = new Set([
    'a',
    'b',
    'blockquote',
    'code',
    'em',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'i',
    'mark',
    'p',
    'small',
    'span',
    'strong',
]);

const DESIGN_FIELDS = [
    ['display', 'Display'],
    ['position', 'Position'],
    ['width', 'Width'],
    ['height', 'Height'],
    ['color', 'Text'],
    ['backgroundColor', 'Background'],
    ['fontSize', 'Font Size'],
    ['fontWeight', 'Weight'],
    ['lineHeight', 'Line Height'],
    ['padding', 'Padding'],
    ['margin', 'Margin'],
    ['borderRadius', 'Radius'],
    ['opacity', 'Opacity'],
] as const;

const MOTION_FIELDS = [
    ['transition', 'Transition'],
    ['animation', 'Animation'],
    ['transform', 'Transform'],
    ['filter', 'Filter'],
    ['boxShadow', 'Shadow'],
] as const;

type StudioImageEntry = {
    name: string;
    path: string;
};

function getNativeSurfaceTheme(
    appearance: 'auto' | 'dark' | 'light',
    accentColor: string,
    highContrast: boolean,
): CSSProperties {
    const isLight = appearance === 'light';
    const foreground = isLight ? '#111827' : '#ffffff';
    const layer = isLight ? '#f8fafc' : '#1a1a28';
    const layerAccent = isLight ? '#ffffff' : '#141422';
    const border = highContrast
        ? (isLight ? 'rgba(15, 23, 42, 0.25)' : 'rgba(255, 255, 255, 0.2)')
        : (isLight ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.1)');

    return {
        ['--cs-accent' as const]: accentColor,
        ['--cs-black' as const]: layerAccent,
        ['--cs-border' as const]: border,
        ['--cs-foreground' as const]: foreground,
        ['--cs-input-bg' as const]: isLight ? 'rgba(15, 23, 42, 0.04)' : 'rgba(255, 255, 255, 0.06)',
        ['--cs-layer' as const]: layer,
        ['--cs-on-accent' as const]: '#0b1020',
        ['--cs-secondary-text' as const]: isLight
            ? 'rgba(17, 24, 39, 0.65)'
            : 'rgba(255, 255, 255, 0.56)',
    } as CSSProperties;
}

function extractMessageText(message: { parts?: Array<{ text?: string; type?: string }> } | null | undefined) {
    if (!message?.parts) {
        return '';
    }

    return message.parts
        .filter((part) => part.type === 'text' && typeof part.text === 'string')
        .map((part) => part.text)
        .join('\n')
        .trim();
}

function findActivePage(nodes: PageNode[], activePath?: string): PageNode | null {
    if (!activePath) {
        return null;
    }

    for (const node of nodes) {
        if (node.path === activePath || node.isActive) {
            return node;
        }

        if (node.children?.length) {
            const nestedMatch = findActivePage(node.children, activePath);
            if (nestedMatch) {
                return nestedMatch;
            }
        }
    }

    return null;
}

function NativeStudioHost({
    children,
    themeStyle,
}: {
    children: ReactNode;
    themeStyle: CSSProperties;
}) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const [portalRoot, setPortalRoot] = useState<HTMLDivElement | null>(null);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) {
            return;
        }

        const shadowRoot = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
        shadowRoot.innerHTML = '';

        const styleTag = document.createElement('style');
        styleTag.textContent = STUDIO_STYLES;
        shadowRoot.appendChild(styleTag);

        const mountNode = document.createElement('div');
        shadowRoot.appendChild(mountNode);
        setPortalRoot(mountNode);

        return () => {
            setPortalRoot(null);
            shadowRoot.innerHTML = '';
        };
    }, []);

    return (
        <div
            ref={hostRef}
            style={{
                ...themeStyle,
                inset: 0,
                pointerEvents: 'none',
                position: 'absolute',
            }}
        >
            {portalRoot ? createPortal(children, portalRoot) : null}
        </div>
    );
}

const PanelButton = ({
    active = false,
    children,
    onClick,
    title,
}: {
    active?: boolean;
    children: ReactNode;
    onClick?: () => void;
    title: string;
}) => {
    return (
        <button
            type="button"
            className={active ? 'studio-icon-button active' : 'studio-icon-button'}
            onClick={onClick}
            title={title}
        >
            {children}
        </button>
    );
};

function NativeStudioElementsPanel({
    roots,
}: {
    roots: LayerNode[];
}) {
    const editorEngine = useEditorEngine();
    const expandedNodes = useNativeStudioStore((state) => state.dom.expandedNodes);
    const toggleNode = useNativeStudioStore((state) => state.toggleNode);
    const selectedIds = new Set(editorEngine.elements.selected.map((element) => element.domId));

    const selectNode = async (node: LayerNode) => {
        const frameData = editorEngine.frames.get(node.frameId);
        if (!frameData?.view) {
            return;
        }

        const element = (await frameData.view.getElementByDomId(
            node.domId,
            true,
        )) as DomElement | null;

        editorEngine.frames.select([frameData.frame]);
        if (element) {
            editorEngine.elements.click([element]);
        }
    };

    const renderNode = (node: LayerNode, depth: number): ReactNode => {
        const isExpanded =
            expandedNodes[node.domId] ?? (node.children?.length ? depth < 2 : false);
        const isActive = selectedIds.has(node.domId);
        const children = node.children
            ?.map((childDomId) => editorEngine.ast.mappings.getLayerNode(node.frameId, childDomId))
            .filter(Boolean) as LayerNode[] | undefined;

        return (
            <div key={node.domId}>
                <div
                    className={isActive ? 'studio-tree-row active' : 'studio-tree-row'}
                    onClick={() => void selectNode(node)}
                    style={{ paddingLeft: `${depth * 14 + 6}px` }}
                >
                    {children && children.length > 0 ? (
                        <button
                            type="button"
                            className="studio-tree-chevron"
                            onClick={(event) => {
                                event.stopPropagation();
                                toggleNode(node.domId);
                            }}
                        >
                            {isExpanded ? (
                                <ChevronDown className="h-3 w-3" />
                            ) : (
                                <ChevronRight className="h-3 w-3" />
                            )}
                        </button>
                    ) : (
                        <span className="studio-tree-spacer" />
                    )}
                    <span className="studio-tree-tag">{`<${node.tagName}>`}</span>
                    <span className="studio-tree-meta">
                        {node.component || node.textContent || node.instanceId || node.oid || node.domId}
                    </span>
                </div>
                {isExpanded && children?.map((child) => renderNode(child, depth + 1))}
            </div>
        );
    };

    if (roots.length === 0) {
        return <div className="studio-muted">No processed DOM tree yet.</div>;
    }

    return <div className="studio-tree">{roots.map((root) => renderNode(root, 0))}</div>;
}

function NativeStudioMetadataPanel() {
    const editorEngine = useEditorEngine();
    const drafts = useNativeStudioStore((state) => state.edit);
    const setTextDrafts = useNativeStudioStore((state) => state.setTextDrafts);

    const activePage = useMemo(
        () => findActivePage(editorEngine.pages.tree, editorEngine.pages.activeRoute),
        [editorEngine.pages.activeRoute, editorEngine.pages.tree],
    );

    useEffect(() => {
        const metadata = activePage?.metadata;
        setTextDrafts({
            metadataDescriptionDraft: metadata?.description ?? '',
            metadataTitleDraft:
                typeof metadata?.title === 'string'
                    ? metadata.title
                    : metadata?.title?.default ?? metadata?.title?.absolute ?? '',
        });
    }, [activePage, setTextDrafts]);

    const saveMetadata = async () => {
        if (!activePage) {
            return;
        }

        const nextMetadata: PageMetadata = {
            ...(activePage.metadata ?? {}),
            applicationName: activePage.metadata?.applicationName,
            description: drafts.metadataDescriptionDraft || undefined,
            title: drafts.metadataTitleDraft || undefined,
        };

        await editorEngine.pages.updateMetadataPage(activePage.path, nextMetadata);
    };

    return (
        <div className="studio-section">
            <div className="studio-section-title">Page Metadata</div>
            <div className="studio-row">
                <label className="studio-label" htmlFor="studio-page-path">
                    Route
                </label>
                <input
                    id="studio-page-path"
                    className="studio-input"
                    readOnly
                    value={activePage?.path ?? editorEngine.pages.activeRoute ?? ''}
                />
            </div>
            <div className="studio-row">
                <label className="studio-label" htmlFor="studio-page-title">
                    Title
                </label>
                <input
                    id="studio-page-title"
                    className="studio-input"
                    value={drafts.metadataTitleDraft}
                    onChange={(event) =>
                        setTextDrafts({ metadataTitleDraft: event.target.value })
                    }
                />
            </div>
            <div className="studio-row">
                <label className="studio-label" htmlFor="studio-page-description">
                    Description
                </label>
                <textarea
                    id="studio-page-description"
                    className="studio-textarea"
                    value={drafts.metadataDescriptionDraft}
                    onChange={(event) =>
                        setTextDrafts({ metadataDescriptionDraft: event.target.value })
                    }
                />
            </div>
            <div className="studio-inline-actions">
                <button type="button" className="studio-button primary" onClick={() => void saveMetadata()}>
                    <FileCode2 className="h-4 w-4" />
                    Save metadata
                </button>
            </div>
        </div>
    );
}

function NativeStudioChatPanel() {
    const editorEngine = useEditorEngine();
    const promptDraft = useNativeStudioStore((state) => state.edit.promptDraft);
    const setPromptDraft = useNativeStudioStore((state) => state.setPromptDraft);
    const [localMessages, setLocalMessages] = useState<Array<{ role: 'assistant' | 'user'; text: string }>>([]);
    const utils = api.useUtils();
    const conversationId = editorEngine.chat.getCurrentConversationId();
    const { data: conversationMessages, isLoading } = api.chat.message.getAll.useQuery(
        { conversationId: conversationId ?? '' },
        { enabled: !!conversationId },
    );

    const sendPrompt = async () => {
        const content = promptDraft.trim();
        if (!content) {
            return;
        }

        setLocalMessages((prev) => [...prev, { role: 'user', text: content }]);
        setPromptDraft('');

        try {
            await editorEngine.chat.sendMessage(content, ChatType.EDIT);
            void utils.chat.invalidate();
        } catch (error) {
            setLocalMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    text: error instanceof Error ? error.message : 'Failed to send message.',
                },
            ]);
        }
    };

    return (
        <div className="studio-section">
            <div className="studio-section-title">Chat</div>
            <div className="studio-message studio-muted">
                Native studio reuses the running Onlook chat backend and mirrors the current
                conversation when it is available.
            </div>
            {isLoading && <div className="studio-muted">Loading conversation...</div>}
            {conversationMessages && conversationMessages.length > 0 && (
                <div className="studio-section">
                    {conversationMessages.map((message) => {
                        const text = extractMessageText(message);
                        if (!text) {
                            return null;
                        }

                        return (
                            <div
                                key={message.id}
                                className={
                                    message.role === 'user'
                                        ? 'studio-message user'
                                        : 'studio-message'
                                }
                            >
                                {text}
                            </div>
                        );
                    })}
                </div>
            )}
            {localMessages.length > 0 && (
                <div className="studio-section">
                    {localMessages.map((message, index) => (
                        <div
                            key={`${message.role}-${index}`}
                            className={message.role === 'user' ? 'studio-message user' : 'studio-message'}
                        >
                            {message.text}
                        </div>
                    ))}
                </div>
            )}
            <textarea
                className="studio-textarea"
                placeholder="Describe the change you want..."
                value={promptDraft}
                onChange={(event) => setPromptDraft(event.target.value)}
            />
            <div className="studio-inline-actions">
                <button type="button" className="studio-button primary" onClick={() => void sendPrompt()}>
                    <Send className="h-4 w-4" />
                    Send
                </button>
                <button
                    type="button"
                    className="studio-button"
                    onClick={() => editorEngine.chat.focusChatInput()}
                >
                    <MessageSquareText className="h-4 w-4" />
                    Focus legacy chat
                </button>
            </div>
        </div>
    );
}

function NativeStudioDesignInspector({
    selectedElement,
}: {
    selectedElement: DomElement | null;
}) {
    const editorEngine = useEditorEngine();
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const settings = useNativeStudioStore((state) => state.settings);

    useEffect(() => {
        const nextDrafts = Object.fromEntries(
            DESIGN_FIELDS.map(([field]) => [
                field,
                selectedElement?.styles?.computed[field] ??
                    selectedElement?.styles?.defined[field] ??
                    '',
            ]),
        );
        setDrafts(nextDrafts);
    }, [selectedElement?.domId, selectedElement?.styles]);

    const applyField = (field: string, value: string) => {
        if (!selectedElement) {
            return;
        }
        editorEngine.style.update(field, value);
    };

    return (
        <div className="studio-section">
            <div className="studio-section-title">Design</div>
            {DESIGN_FIELDS.map(([field, label]) => (
                <div key={field} className="studio-row">
                    <label className="studio-label" htmlFor={`design-${field}`}>
                        {label}
                    </label>
                    <input
                        id={`design-${field}`}
                        className="studio-input"
                        value={drafts[field] ?? ''}
                        onBlur={(event) => applyField(field, event.target.value)}
                        onChange={(event) => {
                            const value = event.target.value;
                            setDrafts((prev) => ({ ...prev, [field]: value }));
                            if (settings.autoApply) {
                                applyField(field, value);
                            }
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                applyField(field, drafts[field] ?? '');
                            }
                        }}
                    />
                </div>
            ))}
        </div>
    );
}

function NativeStudioMotionInspector({
    selectedElement,
}: {
    selectedElement: DomElement | null;
}) {
    const editorEngine = useEditorEngine();
    const scrubberPosition = useNativeStudioStore((state) => state.animation.scrubberPosition);
    const setScrubberPosition = useNativeStudioStore((state) => state.setScrubberPosition);
    const [drafts, setDrafts] = useState<Record<string, string>>({});

    useEffect(() => {
        const nextDrafts = Object.fromEntries(
            MOTION_FIELDS.map(([field]) => [
                field,
                selectedElement?.styles?.computed[field] ??
                    selectedElement?.styles?.defined[field] ??
                    '',
            ]),
        );
        setDrafts(nextDrafts);
    }, [selectedElement?.domId, selectedElement?.styles]);

    return (
        <div className="studio-section">
            <div className="studio-section-title">Motion</div>
            {MOTION_FIELDS.map(([field, label]) => (
                <div key={field} className="studio-row">
                    <label className="studio-label" htmlFor={`motion-${field}`}>
                        {label}
                    </label>
                    <input
                        id={`motion-${field}`}
                        className="studio-input"
                        value={drafts[field] ?? ''}
                        onChange={(event) =>
                            setDrafts((prev) => ({ ...prev, [field]: event.target.value }))
                        }
                        onBlur={() => editorEngine.style.update(field, drafts[field] ?? '')}
                    />
                </div>
            ))}
            <div className="studio-divider" />
            <div className="studio-section-title">Timeline Preview</div>
            <div className="studio-scroll-row">
                <span className="studio-label">Scrubber</span>
                <input
                    className="studio-slider"
                    type="range"
                    min={0}
                    max={100}
                    value={scrubberPosition}
                    onChange={(event) => setScrubberPosition(Number(event.target.value))}
                />
                <span className="studio-label">{scrubberPosition}%</span>
            </div>
        </div>
    );
}

function NativeStudioVariablesInspector() {
    const editorEngine = useEditorEngine();
    const [isSavingFont, setIsSavingFont] = useState(false);

    useEffect(() => {
        void editorEngine.theme.scanConfig();
    }, [editorEngine.theme]);

    const fontByFamily = useMemo(() => {
        return new Map(
            editorEngine.font.fonts.map((font) => [font.family.toLowerCase(), font]),
        );
    }, [editorEngine.font.fonts]);

    const setDefaultFont = async (family: string) => {
        const font = fontByFamily.get(family.toLowerCase());
        if (!font) {
            return;
        }

        setIsSavingFont(true);
        try {
            await editorEngine.font.setDefaultFont(font);
        } finally {
            setIsSavingFont(false);
        }
    };

    return (
        <div className="studio-section">
            <div className="studio-section-title">Tokens and Variables</div>
            {Object.entries(editorEngine.theme.colorGroups).map(([groupName, colors]) => (
                <div key={groupName} className="studio-section">
                    <div className="studio-label">{groupName}</div>
                    <div className="studio-grid">
                        {colors.map((color, index) => (
                            <div key={color.originalKey} className="studio-swatch">
                                <input
                                    className="studio-swatch-color"
                                    type="color"
                                    title={color.name}
                                    value={color.lightColor || '#000000'}
                                    onChange={(event) => {
                                        const nextColor = Color.from(event.target.value);
                                        if (!nextColor) {
                                            return;
                                        }
                                        void editorEngine.theme.update(
                                            groupName,
                                            index,
                                            nextColor,
                                            color.name,
                                            groupName,
                                            'light' as SystemTheme,
                                            true,
                                        );
                                    }}
                                />
                                <span className="studio-label">{color.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {Object.entries(editorEngine.theme.colorDefaults).length > 0 && (
                <div className="studio-section">
                    <div className="studio-section-title">Default Palette</div>
                    {Object.entries(editorEngine.theme.colorDefaults).map(([groupName, colors]) => (
                        <div key={groupName} className="studio-section">
                            <div className="studio-label">{groupName}</div>
                            <div className="studio-grid">
                                {colors.map((color, index) => (
                                    <div key={color.originalKey} className="studio-swatch">
                                        <input
                                            className="studio-swatch-color"
                                            type="color"
                                            value={color.lightColor || '#000000'}
                                            onChange={(event) => {
                                                const nextColor = Color.from(event.target.value);
                                                if (!nextColor) {
                                                    return;
                                                }
                                                void editorEngine.theme.handleDefaultColorChange(
                                                    groupName,
                                                    index,
                                                    nextColor,
                                                    'light' as SystemTheme,
                                                );
                                            }}
                                        />
                                        <span className="studio-label">{color.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="studio-divider" />
            <div className="studio-section-title">Fonts</div>
            <div className="studio-inline-actions">
                {editorEngine.theme.projectFontFamilies.map((family) => {
                    const isDefault = editorEngine.font.defaultFont
                        ? fontByFamily.get(family.toLowerCase())?.id === editorEngine.font.defaultFont
                        : false;

                    return (
                        <button
                            key={family}
                            type="button"
                            className={isDefault ? 'studio-button primary' : 'studio-button'}
                            disabled={isSavingFont || !fontByFamily.get(family.toLowerCase())}
                            onClick={() => void setDefaultFont(family)}
                        >
                            <Type className="h-4 w-4" />
                            {family}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function NativeStudioHtmlInspector({
    selectedElement,
    selectedLayerNode,
}: {
    selectedElement: DomElement | null;
    selectedLayerNode: LayerNode | null;
}) {
    const editorEngine = useEditorEngine();
    const [actionElement, setActionElement] = useState<ActionElement | null>(null);
    const [textDraft, setTextDraft] = useState('');

    useEffect(() => {
        setTextDraft(selectedLayerNode?.textContent ?? '');
    }, [selectedLayerNode?.domId, selectedLayerNode?.textContent]);

    useEffect(() => {
        let cancelled = false;

        const loadActionElement = async () => {
            if (!selectedElement) {
                setActionElement(null);
                return;
            }

            const frameData = editorEngine.frames.get(selectedElement.frameId);
            if (!frameData?.view) {
                setActionElement(null);
                return;
            }

            const nextActionElement = (await frameData.view.getActionElement(
                selectedElement.domId,
            )) as ActionElement | null;

            if (!cancelled) {
                setActionElement(nextActionElement);
            }
        };

        void loadActionElement();

        return () => {
            cancelled = true;
        };
    }, [editorEngine.frames, selectedElement]);

    const applyTextContent = async () => {
        if (!selectedElement || !selectedLayerNode) {
            return;
        }

        const frameData = editorEngine.frames.get(selectedElement.frameId);
        if (!frameData?.view) {
            return;
        }

        const result = await frameData.view.editText(selectedElement.domId, textDraft);
        if (!result) {
            return;
        }

        await editorEngine.history.push({
            type: 'edit-text',
            targets: [
                {
                    frameId: selectedElement.frameId,
                    branchId: selectedElement.branchId,
                    domId: selectedElement.domId,
                    oid: selectedElement.oid,
                },
            ],
            newContent: textDraft,
            originalContent: selectedLayerNode.textContent ?? '',
        });

        editorEngine.elements.click([result.domEl]);
        await editorEngine.overlay.refresh();
    };

    const canEditText = selectedLayerNode
        ? TEXT_TAGS.has(selectedLayerNode.tagName.toLowerCase())
        : false;

    return (
        <div className="studio-section">
            <div className="studio-section-title">HTML</div>
            <div className="studio-row">
                <span className="studio-label">Tag</span>
                <input
                    className="studio-input"
                    readOnly
                    value={selectedLayerNode?.tagName ?? selectedElement?.tagName ?? ''}
                />
            </div>
            <div className="studio-row">
                <span className="studio-label">OID</span>
                <input
                    className="studio-input"
                    readOnly
                    value={selectedLayerNode?.instanceId ?? selectedLayerNode?.oid ?? ''}
                />
            </div>

            <div className="studio-section">
                <div className="studio-section-title">Attributes</div>
                {actionElement?.attributes && Object.keys(actionElement.attributes).length > 0 ? (
                    Object.entries(actionElement.attributes).map(([key, value]) => (
                        <div key={key} className="studio-row">
                            <span className="studio-label">{key}</span>
                            <input className="studio-input" readOnly value={String(value ?? '')} />
                        </div>
                    ))
                ) : (
                    <div className="studio-muted">No serializable attributes available.</div>
                )}
            </div>

            <div className="studio-section">
                <div className="studio-section-title">Text</div>
                <textarea
                    className="studio-textarea"
                    disabled={!canEditText}
                    value={textDraft}
                    onChange={(event) => setTextDraft(event.target.value)}
                />
                <div className="studio-inline-actions">
                    <button
                        type="button"
                        className="studio-button primary"
                        disabled={!canEditText}
                        onClick={() => void applyTextContent()}
                    >
                        <Type className="h-4 w-4" />
                        Apply text
                    </button>
                    <button
                        type="button"
                        className="studio-button"
                        onClick={() => void editorEngine.copy.duplicate()}
                    >
                        <Copy className="h-4 w-4" />
                        Duplicate
                    </button>
                    <button
                        type="button"
                        className="studio-button danger"
                        onClick={() => void editorEngine.elements.delete()}
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

function NativeStudioImagesPanel({
    images,
}: {
    images: StudioImageEntry[];
}) {
    const editorEngine = useEditorEngine();

    return (
        <div className="studio-section">
            <div className="studio-section-title">Images</div>
            {images.length === 0 ? (
                <div className="studio-muted">No image assets detected in the local project.</div>
            ) : (
                images.map((image) => (
                    <div key={image.path} className="studio-inline-actions">
                        <button
                            type="button"
                            className="studio-button"
                            onClick={async () => {
                                const [selectedImage] = await editorEngine.image.readImagesContent([
                                    image.path,
                                ]);
                                if (selectedImage) {
                                    editorEngine.image.setSelectedImage(selectedImage);
                                }
                            }}
                        >
                            <FileImage className="h-4 w-4" />
                            {image.name}
                        </button>
                    </div>
                ))
            )}
        </div>
    );
}

function NativeStudioTimeline({
    selectedElement,
}: {
    selectedElement: DomElement | null;
}) {
    const editorEngine = useEditorEngine();
    const scrubberPosition = useNativeStudioStore((state) => state.animation.scrubberPosition);
    const setScrubberPosition = useNativeStudioStore((state) => state.setScrubberPosition);

    return (
        <div className="studio-panel bottom">
            <div className="studio-panel-header">
                <CircleGauge className="h-4 w-4" />
                <span className="studio-label">Timeline</span>
            </div>
            <div className="studio-panel-content">
                {MOTION_FIELDS.map(([field, label]) => (
                    <div key={field} className="studio-timeline-row">
                        <span className="studio-label">{label}</span>
                        <input
                            className="studio-input"
                            value={
                                selectedElement?.styles?.computed[field] ??
                                selectedElement?.styles?.defined[field] ??
                                ''
                            }
                            onChange={(event) => editorEngine.style.update(field, event.target.value)}
                        />
                    </div>
                ))}
                <div className="studio-divider" />
                <div className="studio-scroll-row">
                    <span className="studio-label">Preview</span>
                    <input
                        className="studio-slider"
                        type="range"
                        min={0}
                        max={100}
                        value={scrubberPosition}
                        onChange={(event) => setScrubberPosition(Number(event.target.value))}
                    />
                    <span className="studio-label">{scrubberPosition}%</span>
                </div>
            </div>
        </div>
    );
}

const NativeStudioShell = observer(() => {
    const editorEngine = useEditorEngine();
    const {
        availability,
        settings: runtimeSettings,
        setSettings,
    } = useStudioRuntime();
    const panels = useNativeStudioStore((state) => state.panels);
    const storeSettings = useNativeStudioStore((state) => state.settings);
    const setInspectorTab = useNativeStudioStore((state) => state.setInspectorTab);
    const setNavigatorTab = useNativeStudioStore((state) => state.setNavigatorTab);
    const togglePanel = useNativeStudioStore((state) => state.togglePanel);
    const syncSettings = useNativeStudioStore((state) => state.setSetting);
    const [images, setImages] = useState<StudioImageEntry[]>([]);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const selectedElement = editorEngine.elements.selected[0] ?? null;
    const selectedLayerNode = selectedElement
        ? editorEngine.ast.mappings.getLayerNode(selectedElement.frameId, selectedElement.domId) ?? null
        : null;
    const roots = editorEngine.ast.mappings.filteredLayers;

    useEffect(() => {
        syncSettings(runtimeSettings);
    }, [runtimeSettings, syncSettings]);

    useEffect(() => {
        let cancelled = false;

        const loadImages = async () => {
            const entries = await editorEngine.activeSandbox.listAllFiles();
            const nextImages = entries
                .filter((entry) => entry.type === 'file' && isImageFile(entry.path))
                .map((entry) => ({
                    name: getBaseName(entry.path),
                    path: entry.path,
                }))
                .sort((left, right) => left.name.localeCompare(right.name));

            if (!cancelled) {
                setImages(nextImages);
            }
        };

        void loadImages();

        return () => {
            cancelled = true;
        };
    }, [editorEngine.activeSandbox]);

    const setCollapsed = (nextValue: boolean) => {
        syncSettings({ collapsed: nextValue });
        setSettings({ collapsed: nextValue });
    };

    const openElements = () => {
        editorEngine.state.editorMode = EditorMode.DESIGN;
        setNavigatorTab('elements');
        if (!panels.navigatorOpen) {
            togglePanel('navigatorOpen');
        }
    };

    const openChat = () => {
        editorEngine.state.editorMode = EditorMode.DESIGN;
        setNavigatorTab('chat');
        if (!panels.navigatorOpen) {
            togglePanel('navigatorOpen');
        }
    };

    const applyPendingChanges = async () => {
        await editorEngine.history.commitTransaction();
        await editorEngine.refreshLayers();
        await editorEngine.overlay.refresh();
    };

    useEffect(() => {
        const handleHotkeys = (event: KeyboardEvent) => {
            if (!event.altKey || event.defaultPrevented) {
                return;
            }

            const target = event.target as HTMLElement | null;
            if (
                target &&
                (target.isContentEditable ||
                    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
            ) {
                return;
            }

            const key = event.key.toLowerCase();
            switch (key) {
                case 'e':
                    event.preventDefault();
                    openElements();
                    break;
                case 't':
                    event.preventDefault();
                    openChat();
                    break;
                case 'i':
                    event.preventDefault();
                    setInspectorTab('design');
                    if (!panels.inspectorOpen) {
                        togglePanel('inspectorOpen');
                    }
                    break;
                case 'r':
                    event.preventDefault();
                    void editorEngine.refreshLayers();
                    break;
                case '.':
                    event.preventDefault();
                    setCollapsed(!storeSettings.collapsed);
                    break;
                default:
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        void applyPendingChanges();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleHotkeys);
        return () => {
            window.removeEventListener('keydown', handleHotkeys);
        };
    }, [
        editorEngine,
        panels.inspectorOpen,
        setInspectorTab,
        setNavigatorTab,
        storeSettings.collapsed,
        togglePanel,
    ]);

    const accentColor = ACCENT_COLORS[storeSettings.scheme] ?? ACCENT_COLORS.indigo;
    const themeStyle = getNativeSurfaceTheme(
        storeSettings.appearance,
        accentColor,
        storeSettings.highContrast,
    );

    const renderNavigatorContent = () => {
        switch (panels.navigatorTab) {
            case 'elements':
                return <NativeStudioElementsPanel roots={roots} />;
            case 'metadata':
                return <NativeStudioMetadataPanel />;
            case 'chat':
                return <NativeStudioChatPanel />;
            default:
                return null;
        }
    };

    const renderInspectorContent = () => {
        switch (panels.inspectorTab) {
            case 'design':
                return <NativeStudioDesignInspector selectedElement={selectedElement} />;
            case 'motion':
                return <NativeStudioMotionInspector selectedElement={selectedElement} />;
            case 'variables':
                return <NativeStudioVariablesInspector />;
            case 'html':
                return (
                    <NativeStudioHtmlInspector
                        selectedElement={selectedElement}
                        selectedLayerNode={selectedLayerNode}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <NativeStudioHost themeStyle={themeStyle}>
            <div className="studio-root">
                <div className="studio-toolbar">
                    <PanelButton
                        active={panels.navigatorOpen && panels.navigatorTab === 'elements'}
                        onClick={openElements}
                        title="Elements"
                    >
                        <Layers3 className="h-4 w-4" />
                    </PanelButton>
                    <PanelButton
                        active={panels.navigatorOpen && panels.navigatorTab === 'chat'}
                        onClick={openChat}
                        title="Chat"
                    >
                        <MessageSquareText className="h-4 w-4" />
                    </PanelButton>
                    <PanelButton
                        active
                        onClick={() => {
                            editorEngine.state.editorMode = EditorMode.DESIGN;
                            openElements();
                        }}
                        title="Picker"
                    >
                        <ScanSearch className="h-4 w-4" />
                    </PanelButton>
                    <PanelButton
                        active={panels.timelineOpen}
                        onClick={() => togglePanel('timelineOpen')}
                        title="Timeline"
                    >
                        <PanelBottom className="h-4 w-4" />
                    </PanelButton>
                    <PanelButton
                        active={panels.inspectorOpen}
                        onClick={() => togglePanel('inspectorOpen')}
                        title="Inspector"
                    >
                        <PanelRight className="h-4 w-4" />
                    </PanelButton>
                    <PanelButton
                        onClick={() => void applyPendingChanges()}
                        title="Apply"
                    >
                        <FileCode2 className="h-4 w-4" />
                    </PanelButton>
                    <PanelButton
                        onClick={() => void editorEngine.refreshLayers()}
                        title="Refresh DOM"
                    >
                        <RefreshCcw className="h-4 w-4" />
                    </PanelButton>
                    <PanelButton
                        active={storeSettings.collapsed}
                        onClick={() => setCollapsed(!storeSettings.collapsed)}
                        title="Collapse"
                    >
                        {storeSettings.collapsed ? (
                            <ChevronRight className="h-4 w-4" />
                        ) : (
                            <ChevronDown className="h-4 w-4" />
                        )}
                    </PanelButton>
                    <div style={{ position: 'relative' }}>
                        <PanelButton
                            active={isSettingsOpen}
                            onClick={() => setIsSettingsOpen((value) => !value)}
                            title="Settings"
                        >
                            <Settings2 className="h-4 w-4" />
                        </PanelButton>
                        {isSettingsOpen && (
                            <div className="studio-settings-popover">
                                <div className="studio-section">
                                    <div className="studio-section-title">Appearance</div>
                                    <div className="studio-segment">
                                        {(['auto', 'dark', 'light'] as const).map((appearance) => (
                                            <button
                                                key={appearance}
                                                type="button"
                                                className={
                                                    storeSettings.appearance === appearance
                                                        ? 'studio-segment-button active'
                                                        : 'studio-segment-button'
                                                }
                                                onClick={() => {
                                                    syncSettings({ appearance });
                                                    setSettings({ appearance });
                                                }}
                                            >
                                                {appearance}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="studio-section">
                                    <div className="studio-section-title">Scheme</div>
                                    <div className="studio-inline-actions">
                                        {Object.entries(ACCENT_COLORS).map(([scheme, color]) => (
                                            <button
                                                key={scheme}
                                                type="button"
                                                className="studio-chip"
                                                onClick={() => {
                                                    syncSettings({ scheme: scheme as keyof typeof ACCENT_COLORS });
                                                    setSettings({
                                                        scheme: scheme as keyof typeof ACCENT_COLORS,
                                                    });
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        background: color,
                                                        borderRadius: '999px',
                                                        display: 'inline-block',
                                                        height: 10,
                                                        width: 10,
                                                    }}
                                                />
                                                {scheme}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="studio-inline-actions">
                                    <button
                                        type="button"
                                        className={storeSettings.autoApply ? 'studio-button primary' : 'studio-button'}
                                        onClick={() => {
                                            const nextValue = !storeSettings.autoApply;
                                            syncSettings({ autoApply: nextValue });
                                            updateNativeStudioSettings({ autoApply: nextValue });
                                        }}
                                    >
                                        Auto Apply
                                    </button>
                                    <button
                                        type="button"
                                        className={storeSettings.highContrast ? 'studio-button primary' : 'studio-button'}
                                        onClick={() => {
                                            const nextValue = !storeSettings.highContrast;
                                            syncSettings({ highContrast: nextValue });
                                            updateNativeStudioSettings({ highContrast: nextValue });
                                        }}
                                    >
                                        High Contrast
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {!storeSettings.collapsed && panels.navigatorOpen && (
                    <div className="studio-panel left">
                        <div className="studio-panel-header">
                            <PanelLeft className="h-4 w-4" />
                            <span className="studio-label">Navigator</span>
                            <div className="studio-tab-row">
                                {(['elements', 'metadata', 'chat'] as NativeNavigatorTab[]).map((tab) => (
                                    <button
                                        key={tab}
                                        type="button"
                                        className={
                                            panels.navigatorTab === tab ? 'studio-tab active' : 'studio-tab'
                                        }
                                        onClick={() => setNavigatorTab(tab)}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="studio-panel-content">
                            {renderNavigatorContent()}
                            <div className="studio-divider" />
                            <NativeStudioImagesPanel images={images} />
                        </div>
                    </div>
                )}

                {!storeSettings.collapsed && panels.inspectorOpen && (
                    <div className="studio-panel right">
                        <div className="studio-panel-header">
                            <Paintbrush2 className="h-4 w-4" />
                            <span className="studio-label">Inspector</span>
                            <div className="studio-tab-row">
                                {(['design', 'motion', 'variables', 'html'] as NativeInspectorTab[]).map((tab) => (
                                    <button
                                        key={tab}
                                        type="button"
                                        className={
                                            panels.inspectorTab === tab ? 'studio-tab active' : 'studio-tab'
                                        }
                                        onClick={() => setInspectorTab(tab)}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="studio-panel-content">{renderInspectorContent()}</div>
                    </div>
                )}

                {!storeSettings.collapsed && panels.timelineOpen && (
                    <NativeStudioTimeline selectedElement={selectedElement} />
                )}

                {!availability.native && (
                    <div className="studio-panel left">
                        <div className="studio-panel-content">
                            <div className="studio-message">
                                Native studio is only available inside project editor routes.
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </NativeStudioHost>
    );
});

export const NativeStudio = observer(() => {
    return <NativeStudioShell />;
});
