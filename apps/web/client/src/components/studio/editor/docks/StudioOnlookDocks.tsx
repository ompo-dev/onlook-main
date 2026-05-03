import { observer } from 'mobx-react-lite';
import { useEditorEngine } from '@/components/store/editor';
import { useStore } from '../state/use-store';
import { selectElements } from '../state/dom-bridge';
import { useUndoStore } from '../state/use-undo';
import { StudioElementDock } from './StudioElementDock';
import { StudioFrameDock } from './StudioFrameDock';
import { StudioMainDock } from './StudioMainDock';

export const StudioOnlookDocks = observer(() => {
    const editorEngine = useEditorEngine();
    const selectedNodeId = useStore((state) => state.selectedNodeId);
    const clearSelection = useStore((state) => state.clearSelection);
    const undoClear = useUndoStore((state) => state.clear);
    const selectedFrame = editorEngine.frames.selected[0];

    const clearStudioSelection = () => {
        clearSelection();
        selectElements([], null as any);
        undoClear();
        editorEngine.elements.clear();
        editorEngine.overlay.clearUI();
    };

    return (
        <>
            {selectedNodeId !== null ? (
                <StudioElementDock
                    onClearSelection={clearStudioSelection}
                />
            ) : selectedFrame ? (
                <StudioFrameDock />
            ) : null}
            <StudioMainDock />
        </>
    );
});
