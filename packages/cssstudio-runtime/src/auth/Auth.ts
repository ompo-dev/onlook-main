const TOKEN_KEY = 'css-studio-auth-token';
const REFRESH_TOKEN_KEY = 'css-studio-refresh-token';
const AUTH_LAST_CHECK_KEY = 'css-studio-auth-last-check';
const AUTH_LAST_RESULT_KEY = 'css-studio-auth-last-result';
const AUTH_CHECK_TTL_MS = 24 * 60 * 60 * 1000;
const SUPABASE_URL = 'https://veiiwlqogyudtdpgyhcp.supabase.co';
const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlaWl3bHFvZ3l1ZHRkcGd5aGNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzY2MjQsImV4cCI6MjA4OTUxMjYyNH0.uAVUqU3R4hRbXQBqk3UbWTjop9Ls-JZePh7oGfrZXgs';

export class CssStudioAuth {
    private _isAuthenticated: boolean | null = null;
    private _authPromise: Promise<boolean> | null = null;

    async getToken(): Promise<string | undefined> {
        return localStorage.getItem(TOKEN_KEY) ?? undefined;
    }

    async getRefreshToken(): Promise<string | undefined> {
        return localStorage.getItem(REFRESH_TOKEN_KEY) ?? undefined;
    }

    async storeTokens(token: string, refreshToken?: string): Promise<void> {
        localStorage.setItem(TOKEN_KEY, token);
        if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }

    private async getCachedAuthResult(): Promise<boolean | null> {
        const lastCheck = localStorage.getItem(AUTH_LAST_CHECK_KEY);
        const lastResult = localStorage.getItem(AUTH_LAST_RESULT_KEY);
        if (!lastCheck || !lastResult) return null;
        const checkTime = Number(lastCheck);
        if (isNaN(checkTime) || Date.now() - checkTime > AUTH_CHECK_TTL_MS) return null;
        return lastResult === 'true';
    }

    private async storeAuthResult(result: boolean): Promise<void> {
        this._isAuthenticated = result;
        localStorage.setItem(AUTH_LAST_CHECK_KEY, String(Date.now()));
        localStorage.setItem(AUTH_LAST_RESULT_KEY, String(result));
    }

    async checkToken(token: string): Promise<boolean> {
        try {
            const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
                headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
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
            return cached ?? false;
        }
    }

    async tryRefresh(): Promise<boolean> {
        const refreshToken = await this.getRefreshToken();
        if (!refreshToken) return false;
        try {
            const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
                body: JSON.stringify({ refresh_token: refreshToken }),
            });
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

    async isAuthenticated(): Promise<boolean> {
        if (this._isAuthenticated !== null) return this._isAuthenticated;
        const token = await this.getToken();
        if (!token) { this._isAuthenticated = false; return false; }
        const cached = await this.getCachedAuthResult();
        if (cached !== null) { this._isAuthenticated = cached; return cached; }
        if (this._authPromise) return this._authPromise;
        this._authPromise = this.checkToken(token);
        try {
            return await this._authPromise;
        } finally {
            this._authPromise = null;
        }
    }

    async markAuthenticated(): Promise<void> {
        await this.storeAuthResult(true);
    }

    async logout(): Promise<void> {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(AUTH_LAST_CHECK_KEY);
        localStorage.removeItem(AUTH_LAST_RESULT_KEY);
        this._isAuthenticated = null;
    }
}

export const auth = new CssStudioAuth();
