import { useStore } from '../state/use-store';
import { EditableInput } from './EditableInput';
import { PlusIcon } from '../icons/PlusIcon';
import styles from './AnimationsPanel.module.css';

const validateAnimName = (v: string) => v.replace(/[^a-zA-Z0-9_-]/g, '-');

export function KeyframesDropdown() {
    const rules = useStore((s) => s.keyframesRules);
    const selected = useStore((s) => s.selectedKeyframesName);
    const select = useStore((s) => s.selectKeyframesRule);
    const selectedAnimIndex = useStore((s) => s.selectedAnimationIndex);
    const updateEntry = useStore((s) => s.updateAnimationEntry);
    const creating = useStore((s) => s.creatingAnimation);
    const commitName = useStore((s) => s.commitAnimationName);
    const cancelCreate = useStore((s) => s.cancelCreateAnimation);
    const createAnimation = useStore((s) => s.createAnimation);
    const selectedNodeId = useStore((s) => s.selectedNodeId);
    const addPendingAttachment = useStore((s) => s.addPendingAttachment);
    const openChat = useStore((s) => s.openChat);

    if (creating) {
        return (
            <EditableInput
                placeholder="animation-name"
                validate={validateAnimName}
                onCommit={(name) => (name ? commitName(name) : cancelCreate())}
                onCancel={cancelCreate}
            />
        );
    }

    return (
        <>
            {rules.length > 0 && (
                <select
                    className={styles.dropdown}
                    value={selected ?? ''}
                    onChange={(e) => {
                        const name = e.target.value || null;
                        select(name);
                        if (name && selectedAnimIndex !== null) {
                            updateEntry(selectedAnimIndex, { name });
                        }
                    }}
                >
                    {rules.map((r) => (
                        <option key={r.name} value={r.name}>{r.name}</option>
                    ))}
                </select>
            )}
            {selectedNodeId !== null && selected && (
                <button
                    className={styles.playbackBtn}
                    onClick={() => {
                        addPendingAttachment({ nodeId: selectedNodeId, label: `@keyframes ${selected}` });
                        openChat();
                    }}
                    title="Add animation to chat"
                >
                    <svg viewBox="0 0 24 24" style={{ fill: 'none' }} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" />
                        <path d="M12 8v6" />
                        <path d="M9 11h6" />
                    </svg>
                </button>
            )}
            <button
                className={styles.playbackBtn}
                onClick={createAnimation}
                title="New animation"
            >
                <PlusIcon />
            </button>
        </>
    );
}
