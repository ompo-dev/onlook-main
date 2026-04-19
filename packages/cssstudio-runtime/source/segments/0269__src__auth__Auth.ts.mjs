// src/auth/Auth.ts
var TOKEN_KEY = "css-studio-auth-token";
var REFRESH_TOKEN_KEY = "css-studio-refresh-token";
var AUTH_LAST_CHECK_KEY = "css-studio-auth-last-check";
var AUTH_LAST_RESULT_KEY = "css-studio-auth-last-result";
var AUTH_CHECK_TTL_MS = 24 * 60 * 60 * 1e3;
var SUPABASE_URL = "https://veiiwlqogyudtdpgyhcp.supabase.co";
var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlaWl3bHFvZ3l1ZHRkcGd5aGNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzY2MjQsImV4cCI6MjA4OTUxMjYyNH0.uAVUqU3R4hRbXQBqk3UbWTjop9Ls-JZePh7oGfrZXgs";
var CssStudioAuth = class {
  constructor() {
    this._isAuthenticated = null;
    this._authPromise = null;
  }
  async getToken() {
    return localStorage.getItem(TOKEN_KEY) ?? void 0;
  }
  async getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY) ?? void 0;
  }
  async storeTokens(token, refreshToken) {
    localStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  async getCachedAuthResult() {
    const lastCheck = localStorage.getItem(AUTH_LAST_CHECK_KEY);
    const lastResult = localStorage.getItem(AUTH_LAST_RESULT_KEY);
    if (!lastCheck || !lastResult) return null;
    const checkTime = Number(lastCheck);
    const result = lastResult === "true";
    if (isNaN(checkTime) || Date.now() - checkTime > AUTH_CHECK_TTL_MS) {
      return null;
    }
    return result;
  }
  async storeAuthResult(result) {
    this._isAuthenticated = result;
    localStorage.setItem(AUTH_LAST_CHECK_KEY, String(Date.now()));
    localStorage.setItem(AUTH_LAST_RESULT_KEY, String(result));
  }
  async checkToken(token) {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_ANON_KEY
        }
      });
      if (res.ok) {
        await this.storeAuthResult(true);
        return true;
      }
      const refreshed = await this.tryRefresh();
      if (refreshed) return true;
      await this.storeAuthResult(false);
      return false;
    } catch {
      const cached = await this.getCachedAuthResult();
      if (cached !== null) return cached;
      return false;
    }
  }
  async tryRefresh() {
    const refreshToken = await this.getRefreshToken();
    if (!refreshToken) return false;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY
          },
          body: JSON.stringify({ refresh_token: refreshToken })
        }
      );
      if (!res.ok) return false;
      const data = await res.json();
      if (data.access_token) {
        await this.storeTokens(data.access_token, data.refresh_token);
        await this.storeAuthResult(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
  async isAuthenticated() {
    if (this._isAuthenticated !== null) {
      return this._isAuthenticated;
    }
    const token = await this.getToken();
    if (!token) {
      this._isAuthenticated = false;
      return false;
    }
    const cached = await this.getCachedAuthResult();
    if (cached !== null) {
      this._isAuthenticated = cached;
      return cached;
    }
    if (this._authPromise) {
      return await this._authPromise;
    }
    this._authPromise = this.checkToken(token);
    try {
      return await this._authPromise;
    } finally {
      this._authPromise = null;
    }
  }
  async markAuthenticated() {
    await this.storeAuthResult(true);
  }
  async logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_LAST_CHECK_KEY);
    localStorage.removeItem(AUTH_LAST_RESULT_KEY);
    this._isAuthenticated = null;
  }
};
var auth = new CssStudioAuth();

