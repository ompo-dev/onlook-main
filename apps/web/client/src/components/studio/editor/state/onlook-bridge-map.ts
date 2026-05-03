export interface OnlookBridgeRef {
    frameId: string;
    domId: string;
}

const keyToId = new Map<string, number>();
const idToRef = new Map<number, OnlookBridgeRef>();
let nextId = 1;

function getKey(frameId: string, domId: string): string {
    return `${frameId}:${domId}`;
}

export function getOnlookBridgeId(frameId: string, domId: string): number {
    const key = getKey(frameId, domId);
    const existing = keyToId.get(key);
    if (existing) {
        return existing;
    }

    const id = nextId++;
    keyToId.set(key, id);
    idToRef.set(id, { frameId, domId });
    return id;
}

export function getOnlookBridgeRef(id: number): OnlookBridgeRef | null {
    return idToRef.get(id) ?? null;
}
