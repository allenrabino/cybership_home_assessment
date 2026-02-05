/**
 * Structured errors for the integration layer.
 * Callers receive meaningful, actionable error types — no swallowed exceptions.
 */

export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "AUTH_FAILED",
  "RATE_LIMITED",
  "CARRIER_ERROR",
  "NETWORK_ERROR",
  "TIMEOUT",
  "MALFORMED_RESPONSE",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface CarrierIntegrationErrorPayload {
  name: string;
  message: string;
  code: ErrorCode;
  statusCode?: number;
  details?: unknown;
}

/** Thrown when validation, auth, carrier, or network issues occur. */
export class CarrierIntegrationError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly statusCode?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "CarrierIntegrationError";
    Object.setPrototypeOf(this, CarrierIntegrationError.prototype);
  }

  toJSON(): CarrierIntegrationErrorPayload {
    const payload: CarrierIntegrationErrorPayload = {
      name: this.name,
      message: this.message,
      code: this.code,
    };
    if (this.statusCode !== undefined) payload.statusCode = this.statusCode;
    if (this.details !== undefined) payload.details = this.details;
    return payload;
  }
}
