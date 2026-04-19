import { serve } from "bun";
import path from "path";

const PRELOAD_SCRIPT_PATH = path.resolve(import.meta.dir + "/../../client/public/onlook-preload-script.js");
const PRELOAD_SCRIPT_NAME = "onlook-preload-script.js";
const PROXY_TARGET_PARAM = "__onlook_target";

let upstreamTarget: string | null = null;

const PROXY_STRIPPED_HEADERS = [
    "connection",
    "content-encoding",
    "content-length",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
] as const;

function createProxyResponseHeaders(
    upstreamHeaders: Headers,
    corsHeaders: Record<string, string>,
): Headers {
    const responseHeaders = new Headers(upstreamHeaders);

    for (const headerName of PROXY_STRIPPED_HEADERS) {
        responseHeaders.delete(headerName);
    }

    Object.entries(corsHeaders).forEach(([key, value]) => responseHeaders.set(key, value));

    return responseHeaders;
}

const server = serve({
    port: 8083,
    async fetch(req) {
        const url = new URL(req.url);

        // Allow CORS for the editor
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
        };

        if (req.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        // Control endpoint: set upstream target
        if (url.pathname === "/__onlook_target" && req.method === "POST") {
            const body = await req.json() as { target: string };
            if (body?.target) {
                upstreamTarget = body.target.replace(/\/$/, "");
                console.log(`[proxy] upstream set to: ${upstreamTarget}`);
            }
            return new Response(JSON.stringify({ ok: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Serve the preload script directly
        if (url.pathname === `/${PRELOAD_SCRIPT_NAME}`) {
            try {
                const file = Bun.file(PRELOAD_SCRIPT_PATH);
                return new Response(file, {
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/javascript",
                        "Cache-Control": "no-cache",
                    },
                });
            } catch {
                return new Response("Script not found", { status: 404, headers: corsHeaders });
            }
        }

        // Proxy all other requests to the upstream target
        const requestTarget = url.searchParams.get(PROXY_TARGET_PARAM)?.replace(/\/$/, "") ?? null;
        if (requestTarget) {
            upstreamTarget = requestTarget;
        }

        if (!upstreamTarget) {
            return new Response("No upstream target set. POST to /__onlook_target first.", {
                status: 503,
                headers: corsHeaders,
            });
        }

        const upstreamUrl = new URL(url.pathname + url.search, `${upstreamTarget}/`);
        upstreamUrl.searchParams.delete(PROXY_TARGET_PARAM);
        const targetUrl = upstreamUrl.toString();

        try {
            const proxyHeaders = new Headers(req.headers);
            // Fix host header so the upstream sees the right host
            proxyHeaders.set("host", new URL(upstreamTarget).host);
            proxyHeaders.delete("accept-encoding"); // avoid compressed responses we can't rewrite

            const upstream = await fetch(targetUrl, {
                method: req.method,
                headers: proxyHeaders,
                body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
            });

            const contentType = upstream.headers.get("content-type") ?? "";

            // Inject preload script into HTML responses
            if (contentType.includes("text/html")) {
                let html = await upstream.text();
                const injection = `<script id="onlook-preload-script" type="module" src="/${PRELOAD_SCRIPT_NAME}"></script>`;
                if (/<head[^>]*>/i.test(html)) {
                    html = html.replace(/<head([^>]*)>/i, `<head$1>${injection}`);
                } else if (/<body[^>]*>/i.test(html)) {
                    html = html.replace(/<body([^>]*)>/i, `<body$1>${injection}`);
                } else {
                    html = `${injection}${html}`;
                }

                const responseHeaders = createProxyResponseHeaders(upstream.headers, corsHeaders);
                responseHeaders.set("content-type", "text/html; charset=utf-8");

                return new Response(html, {
                    status: upstream.status,
                    headers: responseHeaders,
                });
            }

            // Pass through all other responses as-is
            const responseHeaders = createProxyResponseHeaders(upstream.headers, corsHeaders);

            return new Response(upstream.body, {
                status: upstream.status,
                headers: responseHeaders,
            });
        } catch (error) {
            console.error(`[proxy] error forwarding to ${targetUrl}:`, error);
            return new Response(`Proxy error: ${error}`, { status: 502, headers: corsHeaders });
        }
    },
});

console.log(`Onlook proxy server listening on http://localhost:${server.port}`);
