const TOKEN_KEY = 'css-studio-auth-token';
const REFRESH_TOKEN_KEY = 'css-studio-refresh-token';
const AUTH_LAST_CHECK_KEY = 'css-studio-auth-last-check';
const AUTH_LAST_RESULT_KEY = 'css-studio-auth-last-result';

export class CssStudioAuth {
    private _isAuthenticated = true;

    async getToken(): Promise<string | undefined> {
        return localStorage.getItem(TOKEN_KEY) ?? undefined;
    }

    async getRefreshToken(): Promise<string | undefined> {
        return localStorage.getItem(REFRESH_TOKEN_KEY) ?? undefined;
    }

    async storeTokens(token: string, refreshToken?: string): Promise<void> {
        localStorage.setItem(TOKEN_KEY, token);
        if (refreshToken) {
            localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        }
        localStorage.setItem(AUTH_LAST_CHECK_KEY, String(Date.now()));
        localStorage.setItem(AUTH_LAST_RESULT_KEY, 'true');
        this._isAuthenticated = true;
    }

    async checkToken(_token: string): Promise<boolean> {
        this._isAuthenticated = true;
        return true;
    }

    async tryRefresh(): Promise<boolean> {
        this._isAuthenticated = true;
        return true;
    }

    async isAuthenticated(): Promise<boolean> {
        this._isAuthenticated = true;
        return true;
    }

    async markAuthenticated(): Promise<void> {
        this._isAuthenticated = true;
        localStorage.setItem(AUTH_LAST_CHECK_KEY, String(Date.now()));
        localStorage.setItem(AUTH_LAST_RESULT_KEY, 'true');
    }

    async logout(): Promise<void> {
        this._isAuthenticated = true;
        localStorage.setItem(AUTH_LAST_CHECK_KEY, String(Date.now()));
        localStorage.setItem(AUTH_LAST_RESULT_KEY, 'true');
    }
}

export const auth = new CssStudioAuth();
