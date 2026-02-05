/**
 * Configuration from environment variables.
 * No hardcoded secrets; all values from env or defaults.
 */

const DEFAULT_HTTP_TIMEOUT_MS = 15_000;
const DEFAULT_OAUTH_TIMEOUT_MS = 5_000;
const UPS_OAUTH_PATH = "/security/v1/oauth/token";
const UPS_BASE_URL_DEFAULT = "https://onlinetools.ups.com";

export type Config = {
  ups: {
    clientId: string;
    clientSecret: string;
    baseUrl: string;
    oauthUrl: string;
  };
  http: {
    timeoutMs: number;
    oauthTimeoutMs: number;
  };
};

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined || value === "") {
    throw new Error(`Missing required env: ${key}`);
  }
  return value;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return defaultValue;
  const n = Number(raw);
  if (Number.isNaN(n)) throw new Error(`Invalid number for ${key}: ${raw}`);
  return n;
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

export function loadConfig(): Config {
  const baseUrl = getEnv("UPS_BASE_URL", UPS_BASE_URL_DEFAULT);
  const oauthUrl = getEnv("UPS_OAUTH_URL", `${normalizeBaseUrl(baseUrl)}${UPS_OAUTH_PATH}`);

  return {
    ups: {
      clientId: getEnv("UPS_CLIENT_ID"),
      clientSecret: getEnv("UPS_CLIENT_SECRET"),
      baseUrl: normalizeBaseUrl(baseUrl),
      oauthUrl,
    },
    http: {
      timeoutMs: getEnvNumber("HTTP_TIMEOUT_MS", DEFAULT_HTTP_TIMEOUT_MS),
      oauthTimeoutMs: getEnvNumber("OAUTH_TIMEOUT_MS", DEFAULT_OAUTH_TIMEOUT_MS),
    },
  };
}
