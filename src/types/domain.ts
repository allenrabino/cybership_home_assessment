export interface Address {
  lines: string[];
  city: string;
  stateOrProvince: string;
  postalCode: string;
  country: string;
}

export interface PackageDimensions {
  lengthInches: number;
  widthInches: number;
  heightInches: number;
  weightLbs: number;
}

export interface RateRequest {
  origin: Address;
  destination: Address;
  package: PackageDimensions;
  serviceLevel?: string;
}

export interface RateQuote {
  carrier: string;
  serviceName: string;
  serviceCode?: string;
  amountCents: number;
  currency: string;
  estimatedDays?: number;
}

export interface RateService {
  getRates(request: RateRequest): Promise<RateQuote[]>;
}
