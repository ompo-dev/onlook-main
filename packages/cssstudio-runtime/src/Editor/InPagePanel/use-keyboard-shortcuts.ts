import { useEffect } from 'react';
import { useStore } from '../state/use-store';
import { useUndoStore } from '../state/use-undo';
import { selectElements, stopPicker, stopDrawMode, getId, getPageElementAtPoint } from '../state/dom-bridge';
import { findNodeInTree } from '../utils/find-node';
import { buildCopyPrompt } from '../utils/studio-prompt';
import { TREE_HIDDEN_TAGS, getVisibleNodeIds, findNodePath } from './tree-nav-utils';

function isInputFocused(): boolean {
    let el: Element | null = document.activeElement;
    while ((el as HTMLElement)?.shadowRoot?.activeElement) {
        el = (el as HTMLElement).shadowRoot!.activeElement;
    }
    return (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        !!(el as HTMLElement)?.isContentEditable
    );
}

interface KeyboardShortcutsOptions {
    applyEntry: (entry: unknown, direction: 'undo' | 'redo') => void;
    sendEdit: () => void;
    handleSelectNode: (id: number) => void;
    handleToggleSelectNode: (id: number) => void;
    duplicateElement: (id: number) => void;
    deleteElement: (id: number) => void;
    onLogin: () => void;
    isDemo?: boolean;
}

export function useKeyboardShortcuts({
    applyEntry,
    sendEdit,
    handleSelectNode,
    handleToggleSelectNode,
    duplicateElement,
    deleteElement,
    onLogin,
    isDemo,
}: KeyboardShortcutsOptions) {
    const clearSelection = useStore((s) => s.clearSelection);
    const undoClear = useUndoStore((s) => s.clear);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (isInputFocused()) return;
            const isMod = e.metaKey || e.ctrlKey;
            if (!isMod || e.key.toLowerCase() !== 'z') return;
            e.preventDefault();
            if (e.shiftKey) {
                const entry = useUndoStore.getState().redo();
                if (entry) applyEntry(entry, 'redo');
            } else {
                const entry = useUndoStore.getState().undo();
                if (entry) applyEntry(entry, 'undo');
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [applyEntry]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (isInputFocused()) return;
            e.preventDefault();
            const store = useStore.getState();
            if (store.isDrawingElement) { stopDrawMode(); store.setDrawingElement(false); return; }
            if (store.isPickingElement) { stopPicker(); store.setPickingElement(false); return; }
            clearSelection();
            selectElements([], null);
            undoClear();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [clearSelection, undoClear]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); sendEdit(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [sendEdit]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!e.altKey || e.metaKey || e.ctrlKey) return;
            if (isInputFocused()) return;
            const store = useStore.getState();
            if (e.code === 'KeyE') { e.preventDefault(); store.togglePanelTab('navigator', 'elements'); }
            else if (e.code === 'KeyA') { e.preventDefault(); store.togglePanelTab('timeline', 'animations'); }
            else if (e.code === 'KeyT') { e.preventDefault(); store.togglePanelTab('navigator', 'chat'); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!(e.metaKey || e.ctrlKey) || !e.shiftKey || e.code !== 'KeyC') return;
            if (isInputFocused()) return;
            e.preventDefault();
            if (!useStore.getState().isAuthenticated) { onLogin(); return; }
            const { stagedChanges } = useStore.getState();
            if (stagedChanges.length === 0) return;
            const prompt = buildCopyPrompt(stagedChanges, { demo: isDemo });
            navigator.clipboard.writeText(prompt).then(() => { useStore.getState().clearPendingChanges(); });
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onLogin, isDemo]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (isInputFocused()) return;
            const { selectedNodeId: nodeId, selectedNodeIds: ids, animSelectedKeyframes } = useStore.getState();
            if (nodeId === null) return;
            if ((e.metaKey || e.ctrlKey) && e.code === 'KeyD') {
                e.preventDefault();
                for (const id of ids) duplicateElement(id);
            } else if (e.key === 'Delete') {
                if (animSelectedKeyframes.length > 0) return;
                e.preventDefault();
                for (const id of [...ids].reverse()) deleteElement(id);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [duplicateElement, deleteElement]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const { key } = e;
            if (key !== 'ArrowUp' && key !== 'ArrowDown' && key !== 'ArrowLeft' && key !== 'ArrowRight') return;
            if (isInputFocused()) return;
            const store = useStore.getState();
            if (!store.panels.navigator.open || store.panels.navigator.activeTab !== 'elements') return;
            if (!store.domTree || store.selectedNodeId === null) return;
            e.preventDefault();
            if (key === 'ArrowUp' || key === 'ArrowDown') {
                const visible = getVisibleNodeIds(store.domTree, store.expandedNodes);
                const idx = visible.indexOf(store.selectedNodeId);
                if (idx === -1) return;
                const nextIdx = key === 'ArrowUp' ? idx - 1 : idx + 1;
                if (nextIdx >= 0 && nextIdx < visible.length) handleSelectNode(visible[nextIdx]);
            } else if (key === 'ArrowRight') {
                const node = findNodeInTree(store.domTree, store.selectedNodeId);
                if (!node) return;
                const visibleChildren = node.children.filter((c) => !TREE_HIDDEN_TAGS.has(c.localName));
                if (visibleChildren.length === 0) return;
                if (!store.expandedNodes[store.selectedNodeId]) {
                    store.toggleNode(store.selectedNodeId);
                } else {
                    handleSelectNode(visibleChildren[0].id);
                }
            } else if (key === 'ArrowLeft') {
                if (store.expandedNodes[store.selectedNodeId]) {
                    store.toggleNode(store.selectedNodeId);
                } else {
                    const path = findNodePath(store.domTree, store.selectedNodeId);
                    if (path && path.length >= 2) handleSelectNode(path[path.length - 2].id);
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleSelectNode]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.code !== 'Space') return;
            if (isInputFocused()) return;
            const store = useStore.getState();
            if (!store.panels.timeline.open) return;
            if (store.selectedKeyframesName === null) return;
            e.preventDefault();
            if (store.animPlaybackOrigin !== null) {
                store.animStopPlaying();
            } else {
                if (store.animCurrentTime >= 1) store.animScrubTo(0);
                store.animStartPlaying();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    useEffect(() => {
        const handler = (e: PointerEvent) => {
            if (!e.shiftKey) return;
            if (useStore.getState().selectedNodeIds.length === 0) return;
            if (useStore.getState().isPickingElement) return;
            if (isInputFocused()) return;
            const target = e.target as Element;
            if (target.localName === 'css-studio-panel' || target.closest?.('css-studio-panel')) return;
            const el = getPageElementAtPoint(e.clientX, e.clientY);
            if (!el) return;
            e.preventDefault();
            handleToggleSelectNode(getId(el));
        };
        document.addEventListener('pointerdown', handler, true);
        return () => document.removeEventListener('pointerdown', handler, true);
    }, [handleToggleSelectNode]);
}
