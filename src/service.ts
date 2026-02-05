import type { RateCarrierAdapter } from "./carriers/types.js";
import { CarrierIntegrationError } from "./errors/index.js";
import type { RateQuote } from "./types/domain.js";
import { rateRequestSchema } from "./validation/index.js";

export interface RateServiceConfig {
  carriers: RateCarrierAdapter[];
}

export interface RateService {
  getRates(request: unknown): Promise<RateQuote[]>;
}

export function createRateService(config: RateServiceConfig): RateService {
  const { carriers } = config;

  return {
    async getRates(request: unknown): Promise<RateQuote[]> {
      const parsed = rateRequestSchema.safeParse(request);
      if (!parsed.success) {
        throw new CarrierIntegrationError(
          parsed.error.message,
          "VALIDATION_ERROR",
          undefined,
          parsed.error.flatten()
        );
      }

      const quotes: RateQuote[] = [];
      for (const carrier of carriers) {
        const carrierQuotes = await carrier.getRates(parsed.data);
        quotes.push(...carrierQuotes);
      }
      return quotes;
    },
  };
}
