/**
 * UPS HTTP client: OAuth + authenticated Rating API requests.
 * Injected fetch allows stubbing in tests.
 */

import { CarrierIntegrationError } from "../../errors/index.js";
import { errorFromResponse, type FetchFn } from "../../http/index.js";
import type { UpsRateRequestPayload } from "./types.js";

export interface UpsClientConfig {
  baseUrl: string;
  getAccessToken: () => Promise<string>;
  timeoutMs: number;
  /** For tests: inject a stub. Production uses fetchWithTimeout. */
  fetchFn: FetchFn;
}

const RATING_VERSION = "v1";
const MAX_BODY_SUMMARY_LENGTH = 500;
const MAX_RAW_SNIPPET_LENGTH = 200;
const TRANS_ID_LENGTH = 32;

function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Create a client that calls UPS Rating API with Bearer token and timeout.
 */
export function createUpsClient(config: UpsClientConfig): {
  getRates: (body: UpsRateRequestPayload) => Promise<unknown>;
} {
  const { baseUrl, getAccessToken, fetchFn } = config;

  return {
    async getRates(body: UpsRateRequestPayload): Promise<unknown> {
      const requestOption = body.RateRequest.Request.RequestOption;
      const url = `${trimTrailingSlash(baseUrl)}/api/rating/${RATING_VERSION}/${requestOption}`;

      const token = await getAccessToken();

      const res = await fetchFn(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          transId: crypto.randomUUID().replace(/-/g, "").slice(0, TRANS_ID_LENGTH),
          transactionSrc: "carrier-integration-service",
        },
        body: JSON.stringify(body),
      });

      const text = await res.text();

      if (!res.ok) {
        throw errorFromResponse(res.status, text.slice(0, MAX_BODY_SUMMARY_LENGTH));
      }

      if (!text.trim()) {
        throw new CarrierIntegrationError(
          "UPS rate response was empty",
          "MALFORMED_RESPONSE",
          res.status,
          undefined
        );
      }

      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        throw new CarrierIntegrationError(
          "UPS rate response was not valid JSON",
          "MALFORMED_RESPONSE",
          res.status,
          { raw: text.slice(0, MAX_RAW_SNIPPET_LENGTH) }
        );
      }

      return data;
    },
  };
}
