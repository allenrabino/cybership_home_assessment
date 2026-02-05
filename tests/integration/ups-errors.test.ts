import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, vi } from "vitest";
import { createRateService } from "../../src/service.js";
import { createUpsCarrier } from "../../src/carriers/ups/index.js";
import { CarrierIntegrationError } from "../../src/errors/index.js";
import { fetchWithTimeout, type FetchFn } from "../../src/http/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const successFixture = JSON.parse(
  readFileSync(join(__dirname, "fixtures", "ups-rate-response.json"), "utf-8")
);

const validRateRequest = {
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

describe("rate service validation", () => {
  it("throws VALIDATION_ERROR for invalid request", async () => {
    const service = createRateService({
      carriers: [
        createUpsCarrier({
          getAccessToken: async () => "token",
          baseUrl: "https://api.ups.com",
          timeoutMs: 5000,
          fetchFn: async () => new Response("{}"),
        }),
      ],
    });

    await expect(service.getRates({ origin: "invalid" as never })).rejects.toThrow(CarrierIntegrationError);
    await expect(service.getRates({ origin: "invalid" as never })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });
});

describe("UPS carrier error handling", () => {
  it("returns normalized quotes on 200", async () => {
    const fetchFn: FetchFn = async () =>
      new Response(JSON.stringify(successFixture), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }) as Response;

    const service = createRateService({
      carriers: [
        createUpsCarrier({
          getAccessToken: async () => "token",
          baseUrl: "https://api.ups.com",
          timeoutMs: 5000,
          fetchFn,
        }),
      ],
    });

    const quotes = await service.getRates(validRateRequest);
    expect(quotes).toHaveLength(2);
    expect(quotes[0].carrier).toBe("ups");
    expect(quotes[0].amountCents).toBe(1245);
  });

  it("throws AUTH_FAILED on 401", async () => {
    const fetchFn: FetchFn = async () =>
      new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }) as Response;

    const service = createRateService({
      carriers: [
        createUpsCarrier({
          getAccessToken: async () => "token",
          baseUrl: "https://api.ups.com",
          timeoutMs: 5000,
          fetchFn,
        }),
      ],
    });

    await expect(service.getRates(validRateRequest)).rejects.toThrow(CarrierIntegrationError);
    await expect(service.getRates(validRateRequest)).rejects.toMatchObject({
      code: "AUTH_FAILED",
      statusCode: 401,
    });
  });

  it("throws RATE_LIMITED on 429", async () => {
    const fetchFn: FetchFn = async () =>
      new Response("Rate limit exceeded", { status: 429 }) as Response;

    const service = createRateService({
      carriers: [
        createUpsCarrier({
          getAccessToken: async () => "token",
          baseUrl: "https://api.ups.com",
          timeoutMs: 5000,
          fetchFn,
        }),
      ],
    });

    await expect(service.getRates(validRateRequest)).rejects.toThrow(CarrierIntegrationError);
    await expect(service.getRates(validRateRequest)).rejects.toMatchObject({
      code: "RATE_LIMITED",
      statusCode: 429,
    });
  });

  it("throws CARRIER_ERROR on 500", async () => {
    const fetchFn: FetchFn = async () =>
      new Response("Internal Server Error", { status: 500 }) as Response;

    const service = createRateService({
      carriers: [
        createUpsCarrier({
          getAccessToken: async () => "token",
          baseUrl: "https://api.ups.com",
          timeoutMs: 5000,
          fetchFn,
        }),
      ],
    });

    await expect(service.getRates(validRateRequest)).rejects.toThrow(CarrierIntegrationError);
    await expect(service.getRates(validRateRequest)).rejects.toMatchObject({
      code: "CARRIER_ERROR",
      statusCode: 500,
    });
  });

  it("throws MALFORMED_RESPONSE when response is not JSON", async () => {
    const fetchFn: FetchFn = async () =>
      new Response("not json at all", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      }) as Response;

    const service = createRateService({
      carriers: [
        createUpsCarrier({
          getAccessToken: async () => "token",
          baseUrl: "https://api.ups.com",
          timeoutMs: 5000,
          fetchFn,
        }),
      ],
    });

    await expect(service.getRates(validRateRequest)).rejects.toThrow(CarrierIntegrationError);
    await expect(service.getRates(validRateRequest)).rejects.toMatchObject({
      code: "MALFORMED_RESPONSE",
    });
  });

  it("throws TIMEOUT when request exceeds timeout", async () => {
    const hangingFetch: FetchFn = (_, init) =>
      new Promise((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("abort", "AbortError")));
      }) as Promise<Response>;
    const fetchFn = fetchWithTimeout(80, hangingFetch);

    const service = createRateService({
      carriers: [
        createUpsCarrier({
          getAccessToken: async () => "token",
          baseUrl: "https://api.ups.com",
          timeoutMs: 5000,
          fetchFn,
        }),
      ],
    });

    await expect(service.getRates(validRateRequest)).rejects.toThrow(CarrierIntegrationError);
    await expect(service.getRates(validRateRequest)).rejects.toMatchObject({
      code: "TIMEOUT",
    });
  });
});
