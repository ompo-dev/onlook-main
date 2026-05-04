'use client';

import { Fragment, useState } from 'react';
import styles from './ChatTray.module.css';
import { ChevronIcon } from '../icons/ChevronIcon';

const INITIAL_VISIBLE = 5;
const PAGE_SIZE = 5;

function diff(change: any) {
    if (change.from === undefined && change.to === undefined) {
        return undefined;
    }
    return {
        from: change.from ?? '',
        to: change.to ?? '',
    };
}

function describeEdit(change: any) {
    switch (change.type) {
        case 'style':
            return { head: `${change.name ?? 'style'}:`, diff: diff(change) };
        case 'text':
            return { head: 'text:', diff: diff(change) };
        case 'attr':
            return { head: `@${change.name}`, diff: diff(change) };
        case 'attr-delete':
            return { head: `−@${change.name}` };
        case 'attr-rename':
            return { head: `@${change.name}`, detail: 'renamed' };
        case 'delete':
            return { head: 'removed' };
        case 'token':
            return { head: `${change.name ?? 'token'}:`, diff: diff(change) };
        case 'token-rename':
            return { head: `${change.name ?? 'token'}`, detail: 'renamed' };
        case 'tag':
            return { head: 'tag', diff: diff(change) };
        case 'add-child':
            return { head: '+ child' };
        case 'add-sibling':
            return { head: '+ sibling' };
        case 'duplicate':
            return { head: 'duplicated' };
        case 'prompt':
            return { head: 'prompt', detail: change.value };
        case 'keyframe':
            return { head: `@${change.name ?? 'keyframe'}` };
        case 'reorder':
            return { head: 'reordered' };
        case 'metadata':
            return { head: change.name ?? 'metadata', detail: change.value };
        default:
            return { head: change.type ?? 'edit' };
    }
}

function EditRow({ edit }: { edit: any }) {
    const desc = describeEdit(edit);
    return (
        <div className={styles.pendingEditRow}>
            {edit.element && <span className={styles.pendingEditElement}>{edit.element}</span>}
            <span className={styles.pendingEditHead}>{desc.head}</span>
            {desc.diff ? (
                <Fragment>
                    {desc.diff.from && <span className={styles.pendingEditFrom}>{desc.diff.from}</span>}
                    <span className={styles.pendingEditArrow}>→</span>
                    <span className={styles.pendingEditTo}>{desc.diff.to}</span>
                </Fragment>
            ) : (
                desc.detail && <span className={styles.pendingEditDetail}>{desc.detail}</span>
            )}
        </div>
    );
}

export function PendingEditsSection({
    edits,
    title = 'Pending edits',
}: {
    edits: any[];
    title?: string;
}) {
    const [expanded, setExpanded] = useState(false);
    const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

    if (edits.length === 0) {
        return null;
    }

    const visible = edits.slice(0, visibleCount);
    const remaining = edits.length - visibleCount;

    return (
        <div className={styles.pendingEdits}>
            <button
                type="button"
                className={styles.pendingEditsToggle}
                onClick={() => setExpanded((value) => !value)}
                aria-expanded={expanded}
            >
                <span
                    className={`${styles.pendingEditsChevron}${expanded ? ` ${styles.pendingEditsChevronOpen}` : ''}`}
                >
                    <ChevronIcon />
                </span>
                <span className={styles.pendingEditsLabel}>{title}</span>
                <span className={styles.pendingEditsCount}>{edits.length}</span>
            </button>

            {expanded && (
                <div className={styles.pendingEditsList}>
                    {visible.map((edit, index) => (
                        <EditRow key={index} edit={edit} />
                    ))}
                    {remaining > 0 && (
                        <button
                            type="button"
                            className={styles.pendingEditsShowMore}
                            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                        >
                            Show {Math.min(remaining, PAGE_SIZE)} more
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
