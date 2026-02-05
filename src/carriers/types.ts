/**
 * Carrier adapter contract. New carriers (FedEx, USPS, DHL) implement this.
 * Operations beyond rating (labels, tracking) would add similar operation interfaces.
 */

import type { RateRequest, RateQuote } from "../types/domain.js";

export const CARRIER_IDS = ["ups", "fedex", "usps", "dhl"] as const;
export type CarrierId = (typeof CARRIER_IDS)[number];

export interface RateCarrierAdapter {
  readonly carrierId: CarrierId;
  getRates(request: RateRequest): Promise<RateQuote[]>;
}

export interface CarrierConfig {
  [key: string]: unknown;
}
