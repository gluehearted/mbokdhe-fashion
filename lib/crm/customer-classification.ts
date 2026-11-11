import { CrmError, object } from "./contracts";

export const BEHAVIORAL_OPTIONS = ["Value Seeker", "Price Sensitive", "Design Oriented", "Convenience Seeker"] as const;
export const RELATIONSHIP_STATUS_OPTIONS = ["New Customer", "Repeat Buyer"] as const;
export type CustomerClassificationField = "behavioral" | "relationshipStatus";
export interface CustomerClassification { id: string; behavioral: string | null; relationshipStatus: string | null }
export interface ClassificationChange { field: CustomerClassificationField; value: string | null; expectedValue: string | null }

export function parseClassificationChange(input: unknown): ClassificationChange {
  const body = object(input);
  if (Object.keys(body).some(key => !["field", "value", "expectedValue"].includes(key)) ||
    (body.field !== "behavioral" && body.field !== "relationshipStatus")) throw new CrmError("Kolom pelanggan tidak valid.");
  const options: readonly string[] = body.field === "behavioral" ? BEHAVIORAL_OPTIONS : RELATIONSHIP_STATUS_OPTIONS;
  if (body.value !== null && (typeof body.value !== "string" || !options.includes(body.value))) throw new CrmError("Pilihan pelanggan tidak valid.");
  // Legacy values may be displayed and replaced, without rewriting other customers.
  if (body.expectedValue !== null && (typeof body.expectedValue !== "string" || body.expectedValue.length > 2000)) throw new CrmError("Nilai awal pelanggan tidak valid.");
  return { field: body.field, value: body.value as string | null, expectedValue: body.expectedValue as string | null };
}
