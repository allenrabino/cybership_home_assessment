import { CarrierIntegrationError } from "../../errors/index.js";
import type { FetchFn } from "../../http/index.js";

const HTTP_UNAUTHORIZED = 401;
const MAX_BODY_SUMMARY_LENGTH = 500;

export interface UpsOAuthConfig {
  oauthUrl: string;
  clientId: string;
  clientSecret: string;
  timeoutMs: number;
}

export interface UpsTokenResponse {
  access_token: string;
  expires_in: number;
}

export async function fetchUpsToken(
  config: UpsOAuthConfig,
  fetchFn: FetchFn
): Promise<UpsTokenResponse> {
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");

  const res = await fetchFn(config.oauthUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    let bodySummary: string | undefined;
    try {
      const text = await res.text();
      bodySummary = text.slice(0, MAX_BODY_SUMMARY_LENGTH);
    } catch {
      bodySummary = undefined;
    }
    throw new CarrierIntegrationError(
      bodySummary ?? `UPS OAuth failed: ${res.status}`,
      res.status === HTTP_UNAUTHORIZED ? "AUTH_FAILED" : "CARRIER_ERROR",
      res.status,
      { bodySummary }
    );
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new CarrierIntegrationError(
      "UPS OAuth response was not valid JSON",
      "MALFORMED_RESPONSE",
      res.status,
      undefined
    );
  }

  if (data === null || typeof data !== "object") {
    throw new CarrierIntegrationError(
      "UPS OAuth response missing token payload",
      "MALFORMED_RESPONSE",
      res.status,
      data
    );
  }

  const obj = data as Record<string, unknown>;
  const access_token = obj.access_token;
  const expires_in = obj.expires_in;

  if (typeof access_token !== "string" || !access_token) {
    throw new CarrierIntegrationError(
      "UPS OAuth response missing access_token",
      "MALFORMED_RESPONSE",
      res.status,
      data
    );
  }

  const expiresInSeconds = typeof expires_in === "number" ? expires_in : Number(expires_in);
  if (Number.isNaN(expiresInSeconds) || expiresInSeconds <= 0) {
    throw new CarrierIntegrationError(
      "UPS OAuth response invalid expires_in",
      "MALFORMED_RESPONSE",
      res.status,
      data
    );
  }

  return { access_token, expires_in: expiresInSeconds };
}
