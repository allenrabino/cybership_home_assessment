import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { buildUpsRateRequest, parseUpsRateResponse } from "../../src/carriers/ups/rating.js";
import type { RateRequest } from "../../src/types/domain.js";
import { CarrierIntegrationError } from "../../src/errors/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const upsRateResponseFixture = JSON.parse(
  readFileSync(join(__dirname, "fixtures", "ups-rate-response.json"), "utf-8")
);

const sampleRequest: RateRequest = {
  origin: {
    lines: ["123 Main St"],
    city: "Timonium",
    stateOrProvince: "MD",
    postalCode: "21093",
    country: "US",
  },
  destination: {
    lines: ["456 Oak Ave"],
    city: "Alpharetta",
    stateOrProvince: "GA",
    postalCode: "30005",
    country: "US",
  },
  package: {
    lengthInches: 5,
    widthInches: 5,
    heightInches: 5,
    weightLbs: 1,
  },
};

describe("UPS rating request building", () => {
  it("builds valid Shop request when no serviceLevel", () => {
    const payload = buildUpsRateRequest(sampleRequest);
    expect(payload.RateRequest.Request.RequestOption).toBe("Shop");
    expect(payload.RateRequest.Shipment.Shipper.Address.City).toBe("Timonium");
    expect(payload.RateRequest.Shipment.ShipTo.Address.City).toBe("Alpharetta");
    expect(payload.RateRequest.Shipment.ShipFrom.Address.PostalCode).toBe("21093");
    expect(payload.RateRequest.Shipment.Package.Dimensions.Length).toBe("5");
    expect(payload.RateRequest.Shipment.Package.PackageWeight.Weight).toBe("1");
    expect(payload.RateRequest.Shipment.Service).toBeUndefined();
  });

  it("builds Rate request with Service when serviceLevel provided", () => {
    const payload = buildUpsRateRequest({
      ...sampleRequest,
      serviceLevel: "03",
    });
    expect(payload.RateRequest.Request.RequestOption).toBe("Rate");
    expect(payload.RateRequest.Shipment.Service).toEqual({
      Code: "03",
      Description: "03",
    });
  });

  it("uses Ground description when serviceLevel is a code", () => {
    const payload = buildUpsRateRequest({
      ...sampleRequest,
      serviceLevel: "Ground",
    });
    expect(payload.RateRequest.Request.RequestOption).toBe("Rate");
    expect(payload.RateRequest.Shipment.Service?.Code).toBe("03");
  });
});

describe("UPS rating response parsing", () => {
  it("parses successful response into normalized RateQuote[]", () => {
    const quotes = parseUpsRateResponse(upsRateResponseFixture);
    expect(quotes).toHaveLength(2);
    expect(quotes[0]).toEqual({
      carrier: "ups",
      serviceName: "Ground",
      serviceCode: "03",
      amountCents: 1245,
      currency: "USD",
      estimatedDays: 3,
    });
    expect(quotes[1]).toEqual({
      carrier: "ups",
      serviceName: "Next Day Air",
      serviceCode: "01",
      amountCents: 2890,
      currency: "USD",
      estimatedDays: 1,
    });
  });

  it("returns empty array when RatedShipment is empty", () => {
    const quotes = parseUpsRateResponse({
      RateResponse: { RatedShipment: [] },
    });
    expect(quotes).toEqual([]);
  });

  it("throws MALFORMED_RESPONSE when response is not an object", () => {
    expect(() => parseUpsRateResponse(null)).toThrow(CarrierIntegrationError);
    try {
      parseUpsRateResponse(null);
    } catch (e) {
      expect(e).toBeInstanceOf(CarrierIntegrationError);
      expect((e as CarrierIntegrationError).code).toBe("MALFORMED_RESPONSE");
    }
    expect(() => parseUpsRateResponse("string")).toThrow(CarrierIntegrationError);
  });

  it("throws MALFORMED_RESPONSE when RateResponse is missing", () => {
    expect(() => parseUpsRateResponse({})).toThrow(CarrierIntegrationError);
    expect(() => parseUpsRateResponse({ foo: "bar" })).toThrow("RateResponse");
  });
});
