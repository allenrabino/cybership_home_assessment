/**
 * OAuth 2.0 client-credentials: token acquisition, cache, and transparent refresh.
 * Callers use getValidToken() and never deal with expiry.
 */

const MS_PER_SECOND = 1000;
const DEFAULT_REFRESH_BUFFER_SECONDS = 60;

export interface TokenSupplier {
  getToken(): Promise<string>;
}

export interface OAuthTokenResponse {
  access_token: string;
  expires_in: number;
}

export interface TokenCacheConfig {
  getToken: () => Promise<OAuthTokenResponse>;
  /** Buffer in seconds before expiry to refresh */
  refreshBufferSeconds?: number;
}

export function createTokenCache(config: TokenCacheConfig): TokenSupplier {
  let cached: { token: string; expiresAt: number } | null = null;
  const bufferMs = (config.refreshBufferSeconds ?? DEFAULT_REFRESH_BUFFER_SECONDS) * MS_PER_SECOND;

  return {
    async getToken(): Promise<string> {
      const now = Date.now();
      if (cached && cached.expiresAt > now + bufferMs) {
        return cached.token;
      }
      const result = await config.getToken();
      cached = {
        token: result.access_token,
        expiresAt: now + result.expires_in * MS_PER_SECOND,
      };
      return cached.token;
    },
  };
}
