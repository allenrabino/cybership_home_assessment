import { z } from "zod";

const COUNTRY_CODE_LENGTH = 2;

export const addressSchema = z.object({
  lines: z.array(z.string().min(1)).min(1),
  city: z.string().min(1),
  stateOrProvince: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().length(COUNTRY_CODE_LENGTH).transform((s) => s.toUpperCase()),
});

export const packageDimensionsSchema = z.object({
  lengthInches: z.number().positive(),
  widthInches: z.number().positive(),
  heightInches: z.number().positive(),
  weightLbs: z.number().positive(),
});

export const rateRequestSchema = z.object({
  origin: addressSchema,
  destination: addressSchema,
  package: packageDimensionsSchema,
  serviceLevel: z.string().optional(),
});

export type Address = z.output<typeof addressSchema>;
export type PackageDimensions = z.output<typeof packageDimensionsSchema>;
export type RateRequest = z.output<typeof rateRequestSchema>;
export type RateRequestInput = z.input<typeof rateRequestSchema>;
