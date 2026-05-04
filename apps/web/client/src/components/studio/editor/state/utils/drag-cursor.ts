export function lockGrabbingCursor() {
    const body = document.body;
    const previousBodyCursor = body.style.cursor;
    const previousBodyUserSelect = body.style.userSelect;
    body.style.cursor = 'grabbing';
    body.style.userSelect = 'none';

    const host = document.querySelector<HTMLElement>('css-studio-panel');
    const previousHostCursor = host?.style.cursor ?? '';
    if (host) {
        host.style.cursor = 'grabbing';
    }

    return () => {
        body.style.cursor = previousBodyCursor;
        body.style.userSelect = previousBodyUserSelect;
        if (host) {
            host.style.cursor = previousHostCursor;
        }
    };
}
