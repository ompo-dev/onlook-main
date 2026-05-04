function tryUrl(value: string | null | undefined): URL | null {
    if (!value) {
        return null;
    }

    try {
        return new URL(value);
    } catch {
        return null;
    }
}

export function urlKey(url: string | null | undefined): string | null {
    const parsed = tryUrl(url);
    if (!parsed) {
        return null;
    }

    return `${parsed.origin}${parsed.pathname}`;
}

export function pageLabel(
    url: string | null | undefined,
    currentUrl?: string | null,
): string {
    if (!url) {
        return '(unknown)';
    }

    const parsed = tryUrl(url);
    if (!parsed) {
        return url;
    }

    const current = tryUrl(currentUrl);
    if (current && parsed.origin === current.origin) {
        return parsed.pathname || '/';
    }

    const pathname = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : '';
    return `${parsed.host}${pathname}`;
}
