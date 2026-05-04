import type { EditChange } from '../slices/edit-slice';

export function coalesceOrPush(changes: EditChange[], change: EditChange) {
    for (let i = changes.length - 1; i >= 0; i -= 1) {
        const entry = changes[i];
        if (
            entry?.type === change.type &&
            entry.element === change.element &&
            entry.path === change.path &&
            entry.name === change.name
        ) {
            const entryFrom = 'from' in entry ? (entry as EditChange & { from?: string }).from : undefined;
            const changeTo = 'to' in change ? (change as EditChange & { to?: string }).to : undefined;
            if (entryFrom !== undefined || changeTo !== undefined) {
                if (entryFrom !== undefined && changeTo !== undefined && entryFrom === changeTo) {
                    changes.splice(i, 1);
                    return;
                }
                (entry as EditChange & { from?: string }).from = entryFrom;
                (entry as EditChange & { to?: string }).to = changeTo;
            } else {
                entry.value = change.value;
            }
            return;
        }
    }

    changes.push(change);
}

export function coalesceKeyframeOrPush(changes: EditChange[], change: EditChange) {
    const last = changes[changes.length - 1];
    if (last?.type === 'keyframe' && last.name === change.name) {
        last.value = change.value;
        return;
    }
    changes.push(change);
}

export function appendChange(changes: EditChange[], change: EditChange) {
    if (change.type === 'keyframe') {
        coalesceKeyframeOrPush(changes, change);
        return;
    }
    coalesceOrPush(changes, change);
}
