import { CarrierIntegrationError } from "../../errors/index.js";
import type { RateRequest, RateQuote } from "../../types/domain.js";
import type { UpsAddress, UpsRateRequestPayload, UpsRateResponsePayload } from "./types.js";

const UPS_ADDRESS_LINE_LENGTH = 35;
const UPS_ADDRESS_LINE_COUNT = 3;
const UPS_CITY_LENGTH = 30;
const UPS_STATE_LENGTH = 2;
const UPS_POSTAL_LENGTH = 9;
const UPS_COUNTRY_LENGTH = 2;
const DEFAULT_SERVICE_CODE = "03";

const DEFAULT_SHIPPER_NAME = "Shipper";
const DEFAULT_SHIP_TO_NAME = "Ship To";
const DEFAULT_SHIP_FROM_NAME = "Ship From";

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toUpsAddress(
  lines: string[],
  city: string,
  state: string,
  postal: string,
  country: string
): UpsAddress {
  return {
    AddressLine: lines.slice(0, UPS_ADDRESS_LINE_COUNT).map((l) => l.slice(0, UPS_ADDRESS_LINE_LENGTH)),
    City: city.slice(0, UPS_CITY_LENGTH),
    StateProvinceCode: state.slice(0, UPS_STATE_LENGTH),
    PostalCode: postal.slice(0, UPS_POSTAL_LENGTH),
    CountryCode: country.slice(0, UPS_COUNTRY_LENGTH),
  };
}

export function buildUpsRateRequest(request: RateRequest): UpsRateRequestPayload {
  const { origin, destination, package: pkg } = request;
  const serviceLevel = request.serviceLevel?.trim();
  const useRate = Boolean(serviceLevel);
  const serviceCode =
    serviceLevel && (serviceLevel.length === 2 || serviceLevel.length === 3)
      ? serviceLevel
      : DEFAULT_SERVICE_CODE;

  const shipment: UpsRateRequestPayload["RateRequest"]["Shipment"] = {
    Shipper: {
      Name: origin.lines[0]?.slice(0, UPS_ADDRESS_LINE_LENGTH) ?? DEFAULT_SHIPPER_NAME,
      Address: toUpsAddress(origin.lines, origin.city, origin.stateOrProvince, origin.postalCode, origin.country),
    },
    ShipTo: {
      Name: destination.lines[0]?.slice(0, UPS_ADDRESS_LINE_LENGTH) ?? DEFAULT_SHIP_TO_NAME,
      Address: toUpsAddress(destination.lines, destination.city, destination.stateOrProvince, destination.postalCode, destination.country),
    },
    ShipFrom: {
      Name: origin.lines[0]?.slice(0, UPS_ADDRESS_LINE_LENGTH) ?? DEFAULT_SHIP_FROM_NAME,
      Address: toUpsAddress(origin.lines, origin.city, origin.stateOrProvince, origin.postalCode, origin.country),
    },
    PaymentDetails: {
      ShipmentCharge: [{ Type: "01", BillShipper: { AccountNumber: "" } }],
    },
    NumOfPieces: "1",
    Package: {
      PackagingType: { Code: "02", Description: "Package" },
      Dimensions: {
        UnitOfMeasurement: { Code: "IN", Description: "Inches" },
        Length: String(roundTo2(pkg.lengthInches)),
        Width: String(roundTo2(pkg.widthInches)),
        Height: String(roundTo2(pkg.heightInches)),
      },
      PackageWeight: {
        UnitOfMeasurement: { Code: "LBS", Description: "Pounds" },
        Weight: String(roundTo2(pkg.weightLbs)),
      },
    },
    ...(useRate
      ? { Service: { Code: serviceCode, Description: serviceLevel ?? "Ground" } }
      : {}),
  };

  return {
    RateRequest: {
      Request: {
        RequestOption: useRate ? "Rate" : "Shop",
        TransactionReference: { CustomerContext: "carrier-integration-service" },
      },
      Shipment: shipment,
    },
  };
}

export function parseUpsRateResponse(raw: unknown): RateQuote[] {
  if (raw === null || typeof raw !== "object") {
    throw new CarrierIntegrationError("UPS rate response is not an object", "MALFORMED_RESPONSE", undefined, raw);
  }

  const body = raw as Record<string, unknown>;
  const rateResponse = body.RateResponse as UpsRateResponsePayload["RateResponse"] | undefined;
  if (!rateResponse) {
    throw new CarrierIntegrationError("UPS rate response missing RateResponse", "MALFORMED_RESPONSE", undefined, raw);
  }

  const ratedShipments = rateResponse.RatedShipment;
  if (!Array.isArray(ratedShipments) || ratedShipments.length === 0) {
    return [];
  }

  const quotes: RateQuote[] = [];
  for (const s of ratedShipments) {
    const service = s.Service;
    const totalCharge = s.TotalCharge;
    const code = service?.Code ?? "";
    const description = service?.Description ?? "Unknown";
    const monetaryValue = totalCharge?.MonetaryValue;
    const currencyCode = totalCharge?.CurrencyCode ?? "USD";

    if (monetaryValue === undefined || monetaryValue === null) continue;

    const amount = typeof monetaryValue === "string" ? parseFloat(monetaryValue) : Number(monetaryValue);
    if (Number.isNaN(amount)) continue;

    quotes.push({
      carrier: "ups",
      serviceName: description,
      serviceCode: code || undefined,
      amountCents: Math.round(amount * 100),
      currency: currencyCode,
      estimatedDays: typeof s.BusinessDaysInTransit === "number" ? s.BusinessDaysInTransit : undefined,
    });
  }

  return quotes;
}
