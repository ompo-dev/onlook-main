'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { ArrowLeft, Check, CircleAlert, HelpCircle, Plus, Undo2 } from 'lucide-react';
import { useStore } from '../state/use-store';
import { pageLabel, urlKey } from '../utils/url-key';
import { XIcon } from '../icons/XIcon';
import { PencilLineIcon } from '../icons/PencilLineIcon';
import { BrailleSpinner } from './BrailleSpinner';
import styles from './TaskRail.module.css';

const KIND_LABEL: Record<string, string> = {
    prompt: 'Prompt',
    variant: 'Variants',
    responsive: 'Responsive',
};

const RAIL_WIDTH = 220;
const RAIL_SPRING = { type: 'spring' as const, visualDuration: 0.35, bounce: 0 };
const SWIPE_SPRING = { type: 'spring' as const, visualDuration: 0.3, bounce: 0 };
const ROW_HEIGHT = 30;
const ROW_GAP = 2;
const CHIPLIST_VPAD = 4;
const HEADER_HEIGHT = 30;
const RAIL_BORDER = 2;

const paneVariants = {
    enter: (direction: number) => ({ x: direction * RAIL_WIDTH }),
    center: { x: 0 },
    exit: (direction: number) => ({ x: -direction * RAIL_WIDTH }),
};

function hasVariantsHtml(result: unknown) {
    if (!result || typeof result !== 'object') {
        return false;
    }
    const html = (result as { html?: unknown }).html;
    return typeof html === 'string' && html.length > 0;
}

export function TaskRail({
    dismissTask,
    undoTask,
    acceptTask,
    revertTask,
}: {
    dismissTask: (taskId: string) => void;
    undoTask?: (taskId: string) => void;
    acceptTask?: (taskId: string) => void;
    revertTask?: (taskId: string) => void;
}) {
    const tasks = useStore((s: any) => s.tasks);
    const taskOrder = useStore((s: any) => s.taskOrder);
    const currentUrl = useStore((s: any) => s.currentUrl);
    const activeTaskId = useStore((s: any) => s.activeTaskId);
    const setActiveTask = useStore((s: any) => s.setActiveTask);
    const openNewTaskSlot = useStore((s: any) => s.openNewTaskSlot);
    const newTaskSlotOpen = useStore((s: any) => s.newTaskSlotOpen);
    const newTaskDraft = useStore((s: any) => s.newTaskDraft);
    const requestChatFocus = useStore((s: any) => s.requestChatFocus);

    const newTaskHasContent =
        newTaskDraft.text.length > 0 ||
        newTaskDraft.images.length > 0 ||
        newTaskDraft.pendingAttachments.length > 0;

    const [view, setView] = useState<'page' | 'pages'>('page');
    const [pinnedKey, setPinnedKey] = useState<string | null>(null);
    const [direction, setDirection] = useState(1);

    const currentKey = urlKey(currentUrl) ?? '__unknown__';
    const selectedKey = pinnedKey ?? currentKey;

    const { groupsByKey, groupsList } = useMemo(() => {
        const groups = new Map<
            string,
            { key: string; url: string; label: string; taskIds: string[]; lastUpdated: number }
        >();
        for (const id of taskOrder as string[]) {
            const task = tasks[id];
            if (!task) continue;
            const key = urlKey(task.payload.url) ?? '__unknown__';
            const url = task.payload.url ?? '';
            const existing = groups.get(key);
            if (existing) {
                existing.taskIds.push(id);
                if (task.updatedAt > existing.lastUpdated) {
                    existing.lastUpdated = task.updatedAt;
                }
            } else {
                groups.set(key, {
                    key,
                    url,
                    label: pageLabel(task.payload.url, currentUrl),
                    taskIds: [id],
                    lastUpdated: task.updatedAt,
                });
            }
        }
        const list = [...groups.values()].sort((a, b) => b.lastUpdated - a.lastUpdated);
        return { groupsByKey: groups, groupsList: list };
    }, [currentUrl, taskOrder, tasks]);

    const otherPagesCount = useMemo(
        () => groupsList.reduce((count, group) => (group.key !== selectedKey ? count + 1 : count), 0),
        [groupsList, selectedKey],
    );

    const otherRunningCount = useMemo(() => {
        let count = 0;
        for (const group of groupsList) {
            if (group.key === selectedKey) continue;
            for (const id of group.taskIds) {
                const task = tasks[id];
                if (!task) continue;
                if (task.status === 'in-progress' || task.status === 'queued') {
                    count += 1;
                }
            }
        }
        return count;
    }, [groupsList, selectedKey, tasks]);

    const selectedGroup = groupsByKey.get(selectedKey) ?? null;
    const selectedTaskIds = selectedGroup?.taskIds ?? [];
    const isCurrent = selectedKey === currentKey;
    const canGoBack = !isCurrent || otherPagesCount > 0;

    const handleNewTask = () => {
        openNewTaskSlot();
        requestChatFocus();
    };

    const handleChipClick = (id: string) => {
        if (!tasks[id]) return;
        setActiveTask(id);
        requestChatFocus();
    };

    const openPages = () => {
        setDirection(-1);
        setView('pages');
    };

    const pickPage = (key: string) => {
        setDirection(1);
        setPinnedKey(key === currentKey ? null : key);
        setView('page');
    };

    const showNewTaskDraftChip =
        isCurrent && ((activeTaskId === null && newTaskSlotOpen) || newTaskHasContent);
    const newTaskDraftActive = activeTaskId === null && showNewTaskDraftChip;
    const pageRowCount = selectedTaskIds.length + (showNewTaskDraftChip ? 1 : 0);
    const rowCount = view === 'pages' ? groupsList.length : pageRowCount;
    const rowsHeight = rowCount > 0 ? ROW_HEIGHT * rowCount + ROW_GAP * (rowCount - 1) : 0;
    const naturalHeight = RAIL_BORDER + HEADER_HEIGHT + CHIPLIST_VPAD + rowsHeight;

    return (
        <motion.div
            className={styles.rail}
            style={{ minHeight: naturalHeight }}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: RAIL_WIDTH, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={RAIL_SPRING}
        >
            <div className={styles.inner} style={{ width: RAIL_WIDTH }}>
                <div className={styles.viewport}>
                    <AnimatePresence custom={direction} initial={false}>
                        <motion.div
                            key={view}
                            data-cs-view={view}
                            className={styles.pane}
                            custom={direction}
                            variants={paneVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={SWIPE_SPRING}
                        >
                            {view === 'page' && (
                                <PageView
                                    group={selectedGroup}
                                    tasks={tasks}
                                    taskIds={selectedTaskIds}
                                    activeTaskId={activeTaskId}
                                    isCurrent={isCurrent}
                                    otherRunningCount={otherRunningCount}
                                    onBack={canGoBack ? openPages : undefined}
                                    onChipClick={handleChipClick}
                                    onDismiss={dismissTask}
                                    onUndo={undoTask}
                                    onAccept={acceptTask}
                                    onRevert={revertTask}
                                    onNewTask={isCurrent ? handleNewTask : undefined}
                                    showNewTaskDraftChip={showNewTaskDraftChip}
                                    newTaskDraftActive={newTaskDraftActive}
                                    onOpenNewTaskDraft={handleNewTask}
                                />
                            )}
                            {view === 'pages' && (
                                <PagesView
                                    groups={groupsList}
                                    selectedKey={selectedKey}
                                    onPickPage={pickPage}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}

function PageView({
    group,
    tasks,
    taskIds,
    activeTaskId,
    isCurrent,
    otherRunningCount,
    onBack,
    onChipClick,
    onDismiss,
    onUndo,
    onAccept,
    onRevert,
    onNewTask,
    showNewTaskDraftChip,
    newTaskDraftActive,
    onOpenNewTaskDraft,
}: {
    group: { label: string } | null;
    tasks: Record<string, any>;
    taskIds: string[];
    activeTaskId: string | null;
    isCurrent: boolean;
    otherRunningCount: number;
    onBack?: () => void;
    onChipClick: (id: string) => void;
    onDismiss: (id: string) => void;
    onUndo?: (id: string) => void;
    onAccept?: (id: string) => void;
    onRevert?: (id: string) => void;
    onNewTask?: () => void;
    showNewTaskDraftChip: boolean;
    newTaskDraftActive: boolean;
    onOpenNewTaskDraft: () => void;
}) {
    const label = isCurrent ? 'Tasks' : (group?.label ?? '(gone)');
    return (
        <div className={styles.paneInner}>
            <div className={styles.header}>
                {onBack && (
                    <button
                        type="button"
                        className={styles.headerBackButton}
                        onClick={onBack}
                        title="Other pages"
                        aria-label={`Other running tasks (${otherRunningCount})`}
                    >
                        <ArrowLeft size={14} />
                        {otherRunningCount > 0 && (
                            <span className={styles.headerBackCount}>{otherRunningCount}</span>
                        )}
                    </button>
                )}
                <span
                    className={`${styles.headerLabel}${isCurrent ? '' : ` ${styles.headerLabelPage}`}`}
                >
                    {label}
                </span>
                {onNewTask && (
                    <button
                        type="button"
                        className={styles.headerNewTaskButton}
                        onClick={onNewTask}
                        title="Start a new task"
                        aria-label="New task"
                    >
                        <Plus size={14} />
                    </button>
                )}
            </div>

            <div className={styles.chipList}>
                {showNewTaskDraftChip && (
                    <NewTaskDraftChip
                        active={newTaskDraftActive}
                        onClick={onOpenNewTaskDraft}
                    />
                )}
                {taskIds.map((id) => {
                    const task = tasks[id];
                    if (!task) return null;
                    return (
                        <TaskChip
                            key={id}
                            task={task}
                            active={id === activeTaskId}
                            onClick={() => onChipClick(id)}
                            onDismiss={() => onDismiss(id)}
                            onUndo={
                                onUndo && task.undoAnchor !== null && task.resolution !== 'reverted'
                                    ? () => onUndo(id)
                                    : undefined
                            }
                            onAccept={onAccept ? () => onAccept(id) : undefined}
                            onRevert={onRevert ? () => onRevert(id) : undefined}
                        />
                    );
                })}
            </div>
        </div>
    );
}

function PagesView({
    groups,
    selectedKey,
    onPickPage,
}: {
    groups: Array<{ key: string; label: string; taskIds: string[] }>;
    selectedKey: string;
    onPickPage: (key: string) => void;
}) {
    return (
        <div className={styles.paneInner}>
            <div className={styles.header}>
                <span className={styles.headerLabel}>Pages</span>
            </div>
            <div className={styles.chipList}>
                {groups.map((group) => (
                    <button
                        key={group.key}
                        type="button"
                        className={`${styles.pageRow}${group.key === selectedKey ? ` ${styles.pageRowActive}` : ''}`}
                        onClick={() => onPickPage(group.key)}
                    >
                        <span className={styles.pageRowLabel}>{group.label}</span>
                        <span className={styles.chipEditCount}>{group.taskIds.length}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

function NewTaskDraftChip({ active, onClick }: { active: boolean; onClick: () => void }) {
    return (
        <div
            role="button"
            tabIndex={0}
            data-cs-new-task-draft=""
            className={`${styles.chip} ${styles.chipDraft}${active ? ` ${styles.chipActive}` : ''}`}
            onClick={onClick}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onClick();
                }
            }}
            title="Return to new task draft"
            aria-label="New task draft"
        >
            <span className={styles.chipIcon} data-cs-chip-icon="draft">
                <PencilLineIcon />
            </span>
            <span className={styles.chipLabel}>New task</span>
        </div>
    );
}

function TaskChip({
    task,
    active,
    onClick,
    onDismiss,
    onUndo,
    onAccept,
    onRevert,
}: {
    task: any;
    active: boolean;
    onClick: () => void;
    onDismiss: () => void;
    onUndo?: () => void;
    onAccept?: () => void;
    onRevert?: () => void;
}) {
    const messages = task.payload.messages ?? [];
    const firstAgentMessage = messages.find((message: any) => message.role === 'agent');
    const hasAgentMessage = firstAgentMessage !== undefined;
    const fallbackLabel =
        firstAgentMessage?.text?.slice(0, 48) ||
        task.payload.attachments?.[0]?.selector ||
        messages[0]?.text?.slice(0, 24) ||
        'Untitled';
    const label = task.name ?? fallbackLabel;
    const editCount = task.pendingEdits.length;
    const isDraft = messages.length === 0;
    const isNamed = Boolean(task.name) || hasAgentMessage;
    const awaitingPicker =
        task.status === 'awaiting' &&
        !task.question &&
        task.payload.kind === 'variant' &&
        hasVariantsHtml(task.result);
    const labelStateClass = isDraft
        ? ` ${styles.chipDraft}`
        : isNamed
          ? ''
          : ` ${styles.chipUnnamed}`;
    const awaitingClass = awaitingPicker ? ` ${styles.chipAwaiting}` : '';
    const hasDraft = Boolean(
        task.draft &&
            (task.draft.text.length > 0 ||
                task.draft.images.length > 0 ||
                task.draft.pendingAttachments.length > 0),
    );
    const drifted = Boolean(task.drifted);

    return (
        <div
            role="button"
            tabIndex={0}
            data-cs-drifted={drifted || undefined}
            data-cs-has-draft={hasDraft || undefined}
            className={`${styles.chip}${active ? ` ${styles.chipActive}` : ''}${labelStateClass}${awaitingClass}`}
            onClick={onClick}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onClick();
                }
            }}
            title={`${KIND_LABEL[task.payload.kind] ?? 'Task'} · ${task.status}${editCount > 0 ? ` · ${editCount} pending edit${editCount === 1 ? '' : 's'}` : ''}${hasDraft ? ' · unsent draft' : ''}`}
        >
            <StatusIcon task={task} isDraft={isDraft} hasDraft={hasDraft} />
            <span className={styles.chipLabel}>{label}</span>
            {editCount > 0 && (
                <span className={styles.chipEditCount} aria-label={`${editCount} pending edits`}>
                    {editCount}
                </span>
            )}
            {awaitingPicker && onAccept && onRevert ? (
                <span className={`${styles.chipActions} ${styles.chipActionsAwaiting}`}>
                    <button
                        type="button"
                        className={`${styles.chipActionButton} ${styles.chipActionAccept}`}
                        onClick={(event) => {
                            event.stopPropagation();
                            onAccept();
                        }}
                        title="Accept changes"
                        aria-label="Accept task"
                    >
                        <Check size={14} />
                    </button>
                    <button
                        type="button"
                        className={`${styles.chipActionButton} ${styles.chipActionRevert}`}
                        onClick={(event) => {
                            event.stopPropagation();
                            onRevert();
                        }}
                        title="Revert changes"
                        aria-label="Revert task"
                    >
                        <XIcon size={14} />
                    </button>
                </span>
            ) : (
                <span className={styles.chipActions}>
                    {onUndo &&
                        task.status !== 'awaiting' &&
                        task.status !== 'in-progress' &&
                        task.status !== 'queued' && (
                            <button
                                type="button"
                                className={styles.chipActionButton}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onUndo();
                                }}
                                title="Undo this task's changes"
                                aria-label="Undo task"
                            >
                                <Undo2 size={14} />
                            </button>
                        )}
                    {task.status === 'awaiting' && onRevert && (
                        <button
                            type="button"
                            className={`${styles.chipActionButton} ${styles.chipActionRevert}`}
                            onClick={(event) => {
                                event.stopPropagation();
                                onRevert();
                            }}
                            title="Revert changes"
                            aria-label="Revert task"
                        >
                            <Undo2 size={14} />
                        </button>
                    )}
                    <button
                        type="button"
                        className={styles.chipActionButton}
                        onClick={(event) => {
                            event.stopPropagation();
                            onDismiss();
                        }}
                        title="Dismiss"
                        aria-label="Dismiss task"
                    >
                        <XIcon size={14} />
                    </button>
                </span>
            )}
        </div>
    );
}

function StatusIcon({
    task,
    isDraft,
    hasDraft,
}: {
    task: any;
    isDraft: boolean;
    hasDraft: boolean;
}) {
    if (task.panic) {
        return (
            <span
                className={`${styles.chipIcon} ${styles.chipIconFailed}`}
                title={`Panic: ${task.panic.reason}`}
            >
                <CircleAlert size={14} />
            </span>
        );
    }
    if (task.question && !task.question.answered) {
        return (
            <span className={`${styles.chipIcon} ${styles.chipIconAttention}`} title="Agent has a question">
                <HelpCircle size={14} />
            </span>
        );
    }
    if (isDraft || hasDraft) {
        return (
            <span
                className={styles.chipIcon}
                data-cs-chip-icon="draft"
                title={hasDraft && !isDraft ? 'Unsent draft' : undefined}
                aria-label={hasDraft && !isDraft ? 'Has unsent draft' : undefined}
            >
                <PencilLineIcon />
            </span>
        );
    }
    const status = task.status;
    if (status === 'in-progress' || status === 'queued') {
        return (
            <span className={styles.chipIcon}>
                <BrailleSpinner size={13} />
            </span>
        );
    }
    if (status === 'awaiting') {
        if (task.payload.kind === 'variant' && hasVariantsHtml(task.result)) {
            return (
                <span
                    className={`${styles.chipIcon} ${styles.chipIconAttention}`}
                    title="Variants ready — awaiting your selection"
                >
                    <HelpCircle size={14} />
                </span>
            );
        }
        return (
            <span className={`${styles.chipIcon} ${styles.chipIconReady}`}>
                <Check size={14} />
            </span>
        );
    }
    if (status === 'failed') {
        return (
            <span className={`${styles.chipIcon} ${styles.chipIconFailed}`}>
                <CircleAlert size={14} />
            </span>
        );
    }
    if (task.resolution === 'reverted') {
        return (
            <span className={`${styles.chipIcon} ${styles.chipIconReverted}`} title="Reverted">
                <Undo2 size={14} />
            </span>
        );
    }
    if (task.payload.kind === 'variant' && hasVariantsHtml(task.result)) {
        return (
            <span
                className={`${styles.chipIcon} ${styles.chipIconAttention}`}
                title="Variants ready — awaiting your selection"
            >
                <HelpCircle size={14} />
            </span>
        );
    }
    return (
        <span className={`${styles.chipIcon} ${styles.chipIconReady}`}>
            <Check size={14} />
        </span>
    );
}
