import { PENPAL_CHILD_CHANNEL, type PromisifiedPenpalParentMethods } from '@onlook/penpal';
import debounce from 'lodash/debounce';
import { WindowMessenger, connect } from 'penpal';
import { preloadMethods } from './api';

export let penpalParent: PromisifiedPenpalParentMethods | null = null;
let isConnecting = false;

function logPenpalChild(message: string, data?: unknown) {
    if (data === undefined) {
        console.log(`${PENPAL_CHILD_CHANNEL} - ${message}`);
        return;
    }

    console.log(`${PENPAL_CHILD_CHANNEL} - ${message}`, data);
}

/**
 * Find the correct parent window for Onlook connection.
 * Handles both direct iframes (Next.js) and nested iframes (Storybook).
 */
const findOnlookParent = (): Window => {
    const parentWindow = window.parent;
    let topWindow: Window | null = null;

    try {
        topWindow = window.top;
    } catch {
        topWindow = null;
    }

    // If we're not in an iframe, something is wrong
    if (topWindow && window === topWindow) {
        console.warn(`${PENPAL_CHILD_CHANNEL} - Not in an iframe, using window.parent as fallback`);
        return parentWindow;
    }

    // Check if we're in a direct iframe (parent is the top window)
    // This is the Next.js case: Onlook -> Next.js iframe
    if (topWindow && parentWindow === topWindow) {
        return parentWindow;
    }

    // We're in a nested iframe (parent is NOT the top window)
    // This is the Storybook case: Onlook -> CodeSandbox -> Storybook preview iframe
    if (topWindow) {
        console.log(`${PENPAL_CHILD_CHANNEL} - Using window.top for nested iframe scenario`);
        return topWindow;
    }

    // Final fallback
    return parentWindow;
};

const createMessageConnection = async () => {
    if (isConnecting || penpalParent) {
        return penpalParent;
    }

    isConnecting = true;
    console.log(`${PENPAL_CHILD_CHANNEL} - Creating penpal connection`);

    const parentWindow = findOnlookParent();

    const messenger = new WindowMessenger({
        remoteWindow: parentWindow,
        // TODO: Use a proper origin
        allowedOrigins: ['*'],
    });

    const connection = connect({
        messenger,
        log: logPenpalChild,
        // Methods the iframe window is exposing to the parent window.
        methods: preloadMethods
    });

    connection.promise.then((parent) => {
        if (!parent) {
            console.error(`${PENPAL_CHILD_CHANNEL} - Failed to setup penpal connection: child is null`);
            reconnect();
            return;
        }
        const remote = parent as unknown as PromisifiedPenpalParentMethods;
        penpalParent = remote;
        console.log(`${PENPAL_CHILD_CHANNEL} - Penpal connection set`);
    }).finally(() => {
        isConnecting = false;
    });

    connection.promise.catch((error) => {
        console.error(`${PENPAL_CHILD_CHANNEL} - Failed to setup penpal connection:`, error);
        reconnect();
    });

    return penpalParent;
}

const reconnect = debounce(() => {
    if (isConnecting) return;

    console.log(`${PENPAL_CHILD_CHANNEL} - Reconnecting to penpal parent`);
    penpalParent = null; // Reset the parent before reconnecting
    createMessageConnection();
}, 1000);

void createMessageConnection().catch((error) => {
    console.error(`${PENPAL_CHILD_CHANNEL} - Failed to initialize penpal connection:`, error);
});

window.addEventListener('load', () => {
    if (!penpalParent) {
        reconnect();
    }
});

window.setTimeout(() => {
    if (!penpalParent) {
        reconnect();
    }
}, 3000);
