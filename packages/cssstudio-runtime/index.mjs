import { startStudio as startSrcStudio } from "./dist/cssstudio-src.mjs";

const TOKEN_KEY = "css-studio-auth-token";
const AUTH_LAST_CHECK_KEY = "css-studio-auth-last-check";
const AUTH_LAST_RESULT_KEY = "css-studio-auth-last-result";
const LOCAL_AUTH_TOKEN = "onlook-local-cssstudio";
const DEFAULT_MCP_PORT = 9877;

function primeLocalAuth() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(TOKEN_KEY, LOCAL_AUTH_TOKEN);
    window.localStorage.setItem(AUTH_LAST_CHECK_KEY, String(Date.now()));
    window.localStorage.setItem(AUTH_LAST_RESULT_KEY, "true");
  } catch {
  }
}

export function startStudio(options = {}) {
  primeLocalAuth();

  return startSrcStudio({
    mcpPort: DEFAULT_MCP_PORT,
    ...options
  });
}
