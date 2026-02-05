import type { RateRequest, RateQuote } from "../../types/domain.js";
import type { RateCarrierAdapter } from "../types.js";
import { type FetchFn, fetchWithTimeout } from "../../http/index.js";
import { createUpsClient } from "./client.js";
import { buildUpsRateRequest, parseUpsRateResponse } from "./rating.js";

export interface UpsCarrierOptions {
  getAccessToken: () => Promise<string>;
  baseUrl: string;
  timeoutMs: number;
  fetchFn?: FetchFn;
}

export function createUpsCarrier(options: UpsCarrierOptions): RateCarrierAdapter {
  const fetchFn = options.fetchFn ?? fetchWithTimeout(options.timeoutMs);
  const client = createUpsClient({
    baseUrl: options.baseUrl,
    getAccessToken: options.getAccessToken,
    timeoutMs: options.timeoutMs,
    fetchFn,
  });

  return {
    carrierId: "ups",
    async getRates(request: RateRequest): Promise<RateQuote[]> {
      const body = buildUpsRateRequest(request);
      const raw = await client.getRates(body);
      return parseUpsRateResponse(raw);
    },
  };
}

export { buildUpsRateRequest, parseUpsRateResponse } from "./rating.js";
export { createUpsClient } from "./client.js";
export { fetchUpsToken } from "./oauth.js";
