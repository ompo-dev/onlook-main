import { env } from '@/env';

const DEFAULT_ONLOOK_PORT = 3000;
const DEFAULT_LOCAL_PREVIEW_PORT = 3001;
export const LOCAL_PREVIEW_PROXY_URL = 'http://localhost:8083';
export const LOCAL_PREVIEW_PROXY_TARGET_PARAM = '__onlook_target';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

function parseUrl(value: string | null | undefined): URL | null {
    if (!value) {
        return null;
    }

    try {
        return new URL(value);
    } catch {
        return null;
    }
}

function getPort(url: URL): number {
    if (url.port) {
        return Number.parseInt(url.port, 10);
    }

    return url.protocol === 'https:' ? 443 : 80;
}

function getFallbackPreviewPort(sitePort: number): number {
    return sitePort === DEFAULT_LOCAL_PREVIEW_PORT
        ? DEFAULT_LOCAL_PREVIEW_PORT + 1
        : DEFAULT_LOCAL_PREVIEW_PORT;
}

function stripTrailingSlash(value: string): string {
    return value.replace(/\/$/, '');
}

function getConfiguredPreviewOverride(): URL | null {
    const override = parseUrl(env.NEXT_PUBLIC_LOCAL_PREVIEW_URL);
    if (!override) {
        return null;
    }

    override.pathname = '';
    override.search = '';
    override.hash = '';
    return override;
}

export function getLocalPreviewUrl(port?: number): string {
    const override = getConfiguredPreviewOverride();
    if (override) {
        return override.toString().replace(/\/$/, '');
    }

    const siteUrl = parseUrl(env.NEXT_PUBLIC_SITE_URL);
    const sitePort = siteUrl ? getPort(siteUrl) : DEFAULT_ONLOOK_PORT;
    const desiredPort =
        typeof port === 'number' && port > 0 && port <= 65535 ? port : DEFAULT_ONLOOK_PORT;
    const resolvedPort =
        desiredPort === sitePort ? getFallbackPreviewPort(sitePort) : desiredPort;

    return `http://localhost:${resolvedPort}`;
}

export function normalizeLocalPreviewUrl(url: string | null | undefined): string | null {
    if (!url) {
        return url ?? null;
    }

    const parsedUrl = parseUrl(url);
    if (!parsedUrl) {
        return url;
    }

    const siteUrl = parseUrl(env.NEXT_PUBLIC_SITE_URL);
    if (!siteUrl) {
        return parsedUrl.toString().replace(/\/$/, '');
    }

    const currentPort = getPort(parsedUrl);
    const sitePort = getPort(siteUrl);

    if (!LOCAL_HOSTS.has(parsedUrl.hostname) || currentPort !== sitePort) {
        return stripTrailingSlash(parsedUrl.toString());
    }

    const targetUrl = new URL(getLocalPreviewUrl(currentPort));
    parsedUrl.protocol = targetUrl.protocol;
    parsedUrl.hostname = targetUrl.hostname;
    parsedUrl.port = targetUrl.port;

    return stripTrailingSlash(parsedUrl.toString());
}

export function isLocalPreviewProxyUrl(url: string | URL | null | undefined): boolean {
    const parsedUrl = typeof url === 'string' ? parseUrl(url) : url;
    return parsedUrl?.origin === LOCAL_PREVIEW_PROXY_URL;
}

export function resolveLocalPreviewFrameUrl(
    url: string | null | undefined,
    sandboxUrl?: string | null,
): string | null {
    const normalizedSandboxUrl = normalizeLocalPreviewUrl(sandboxUrl) ?? sandboxUrl ?? null;

    if (!url) {
        return normalizedSandboxUrl;
    }

    const parsedUrl = parseUrl(url);
    if (!parsedUrl) {
        return url;
    }

    if (isLocalPreviewProxyUrl(parsedUrl)) {
        const parsedSandboxUrl = parseUrl(normalizedSandboxUrl);
        if (parsedSandboxUrl) {
            return stripTrailingSlash(
                `${parsedSandboxUrl.origin}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`,
            );
        }
    }

    return normalizeLocalPreviewUrl(parsedUrl.toString()) ?? stripTrailingSlash(parsedUrl.toString());
}

export function getLocalPreviewIframeSrc(
    url: string | null | undefined,
    sandboxUrl?: string | null,
): string {
    const resolvedUrl = resolveLocalPreviewFrameUrl(url, sandboxUrl);
    if (!resolvedUrl) {
        return '';
    }

    const parsedUrl = parseUrl(resolvedUrl);
    if (!parsedUrl) {
        return resolvedUrl;
    }

    const proxyUrl = new URL(`${LOCAL_PREVIEW_PROXY_URL}${parsedUrl.pathname}${parsedUrl.search}`);
    proxyUrl.searchParams.set(LOCAL_PREVIEW_PROXY_TARGET_PARAM, parsedUrl.origin);
    proxyUrl.hash = parsedUrl.hash;

    return proxyUrl.toString();
}
