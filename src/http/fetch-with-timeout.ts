/**
 * Fetch with timeout and structured error handling.
 * Used by OAuth and carrier API calls; injectable for tests.
 */

import { CarrierIntegrationError } from "../errors/index.js";

const HTTP_UNAUTHORIZED = 401;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_CLIENT_ERROR_MIN = 400;
const HTTP_CLIENT_ERROR_MAX = 499;

const CARRIER_LABEL = "UPS";

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Wraps fetch with a timeout. On timeout, aborts the request and throws TIMEOUT.
 */
export function fetchWithTimeout(
  timeoutMs: number,
  baseFetch: typeof fetch = fetch
): FetchFn {
  return async (url: string, init?: RequestInit): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await baseFetch(url, {
        ...init,
        signal: init?.signal ?? controller.signal,
      });
      return response;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new CarrierIntegrationError(
          `Request timed out after ${timeoutMs}ms`,
          "TIMEOUT",
          undefined,
          { url }
        );
      }
      const message =
        err instanceof Error ? err.message || "Network request failed" : "Network request failed";
      const cause = err instanceof Error ? err : undefined;
      throw new CarrierIntegrationError(message, "NETWORK_ERROR", undefined, { url, cause });
    } finally {
      clearTimeout(timeoutId);
    }
  };
}

/**
 * Builds a CarrierIntegrationError from an HTTP status and optional body summary.
 */
export function errorFromResponse(
  status: number,
  bodySummary?: string
): CarrierIntegrationError {
  if (status === HTTP_UNAUTHORIZED) {
    return new CarrierIntegrationError(
      bodySummary ?? `${CARRIER_LABEL} authentication failed`,
      "AUTH_FAILED",
      HTTP_UNAUTHORIZED,
      bodySummary !== undefined ? { bodySummary } : undefined
    );
  }
  if (status === HTTP_TOO_MANY_REQUESTS) {
    return new CarrierIntegrationError(
      bodySummary ?? `${CARRIER_LABEL} rate limit exceeded`,
      "RATE_LIMITED",
      HTTP_TOO_MANY_REQUESTS,
      bodySummary !== undefined ? { bodySummary } : undefined
    );
  }
  if (status >= HTTP_CLIENT_ERROR_MIN && status <= HTTP_CLIENT_ERROR_MAX) {
    return new CarrierIntegrationError(
      bodySummary ?? `${CARRIER_LABEL} client error: ${status}`,
      "CARRIER_ERROR",
      status,
      bodySummary !== undefined ? { bodySummary } : undefined
    );
  }
  return new CarrierIntegrationError(
    bodySummary ?? `${CARRIER_LABEL} server error: ${status}`,
    "CARRIER_ERROR",
    status,
    bodySummary !== undefined ? { bodySummary } : undefined
  );
}
