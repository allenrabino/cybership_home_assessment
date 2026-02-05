export type { Address, PackageDimensions, RateRequest } from "../validation/index.js";

export interface RateQuote {
  carrier: string;
  serviceName: string;
  serviceCode?: string;
  amountCents: number;
  currency: string;
  estimatedDays?: number;
}
