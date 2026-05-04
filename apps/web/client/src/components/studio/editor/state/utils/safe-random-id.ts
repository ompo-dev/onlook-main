let counter = 0;

function randomHex(length: number) {
    return Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export function safeRandomId() {
    try {
        const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
        if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
            return cryptoApi.randomUUID();
        }
    } catch {
        //
    }

    counter += 1;
    return `${randomHex(8)}-${randomHex(4)}-4${randomHex(3)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${randomHex(3)}-${randomHex(12)}-${counter.toString(16)}`;
}
