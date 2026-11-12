import { CrmError, object } from "./contracts";

export const BEHAVIORAL_OPTIONS = ["Value Seeker", "Price Sensitive", "Design Oriented", "Convenience Seeker"] as const;
export const RELATIONSHIP_STATUS_OPTIONS = ["New Customer", "Repeat Buyer"] as const;
export const CUSTOMER_TEXT_LIMITS = { consumerType: 120, crisisStatus: 2000 } as const;
export type CustomerTextField = keyof typeof CUSTOMER_TEXT_LIMITS;
export type CustomerClassificationField = "behavioral" | "relationshipStatus" | CustomerTextField;
export const CUSTOMER_FIELD_LABELS: Record<CustomerClassificationField, string> = {
  behavioral: "Behavioral", relationshipStatus: "Status hubungan", consumerType: "Tipe konsumen", crisisStatus: "Status krisis",
};
export interface CustomerClassification { id: string; behavioral: string | null; relationshipStatus: string | null }
export interface ClassificationChange { field: CustomerClassificationField; value: string | null; expectedValue: string | null }

export function parseClassificationChange(input: unknown): ClassificationChange {
  const body = object(input);
  if (Object.keys(body).some(key => !["field", "value", "expectedValue"].includes(key)) ||
    (body.field !== "behavioral" && body.field !== "relationshipStatus" && body.field !== "consumerType" && body.field !== "crisisStatus")) throw new CrmError("Kolom pelanggan tidak valid.");
  let value = body.value;
  if (body.field === "consumerType" || body.field === "crisisStatus") {
    if (value !== null) {
      if (typeof value !== "string" || value.length > CUSTOMER_TEXT_LIMITS[body.field] || (body.field === "consumerType" && /[\r\n]/.test(value)) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
        throw new CrmError(`${CUSTOMER_FIELD_LABELS[body.field]} maksimal ${CUSTOMER_TEXT_LIMITS[body.field]} karakter dan harus berupa teks valid.`);
      }
      value = value.trim() || null;
    }
  } else {
    const options: readonly string[] = body.field === "behavioral" ? BEHAVIORAL_OPTIONS : RELATIONSHIP_STATUS_OPTIONS;
    if (value !== null && (typeof value !== "string" || !options.includes(value))) throw new CrmError("Pilihan pelanggan tidak valid.");
  }
  // Legacy values may be displayed and replaced, without rewriting other customers.
  if (body.expectedValue !== null && (typeof body.expectedValue !== "string" || body.expectedValue.length > (body.field === "consumerType" || body.field === "crisisStatus" ? 8000 : 2000))) throw new CrmError("Nilai awal pelanggan tidak valid.");
  return { field: body.field, value: value as string | null, expectedValue: body.expectedValue as string | null };
}
