export const MAX_BATCH_ITEMS = 20;
export const MAX_PHOTO_BYTES = 160 * 1024;
export const MAX_BATCH_BYTES = 4 * 1024 * 1024;
export const MAX_MONEY = 2_147_483_647;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const PHOTO_PREFIX = "/api/product-photos/";

export class CrmError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export class PendingBatchError extends CrmError {
  readonly outcomeUnknown = true;
  constructor() { super("Status penyimpanan belum dapat dipastikan. Coba kembali tanpa mengubah draft.", 503); }
}

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CrmError("Format data tidak valid.");
  return value as Record<string, unknown>;
}

export function text(value: unknown, max: number, label: string, required = false): string {
  if (typeof value !== "string" && value != null) throw new CrmError(`${label} tidak valid.`);
  const result = (value as string | null | undefined)?.trim() || "";
  if ((required && !result) || result.length > max) throw new CrmError(`${label} wajib sesuai batas ${max} karakter.`);
  return result;
}

export function money(value: unknown, label: string, min = 0): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > MAX_MONEY) {
    throw new CrmError(`${label} harus berupa rupiah bulat antara ${min} dan ${MAX_MONEY}.`);
  }
  return value;
}

export interface BatchItem { draftId: string; description: string; hasPhoto: boolean; fileHash?: string }
export interface BatchPayload { shopOrigin: string; capitalPrice: number; price: number; items: BatchItem[]; editProductId?: string }

export function parseBatch(value: unknown): BatchPayload {
  const body = object(value);
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > MAX_BATCH_ITEMS) {
    throw new CrmError(`Satu batch harus berisi 1–${MAX_BATCH_ITEMS} tas.`);
  }
  const items = body.items.map((value) => {
    const item = object(value);
    if (typeof item.draftId !== "string" || !UUID.test(item.draftId) || typeof item.hasPhoto !== "boolean") {
      throw new CrmError("Identitas draft atau foto tidak valid.");
    }
    return { draftId: item.draftId.toLowerCase(), description: text(item.description, 2000, "Deskripsi"), hasPhoto: item.hasPhoto };
  });
  if (new Set(items.map(i => i.draftId)).size !== items.length) throw new CrmError("Draft tas tidak boleh duplikat.");
  return {
    shopOrigin: text(body.shopOrigin, 120, "Supplier", true),
    capitalPrice: money(body.capitalPrice, "Harga modal"),
    price: money(body.price, "Harga jual", 1), items,
    ...(body.editProductId !== undefined ? { editProductId: text(body.editProductId, 200, "ID produk", true) } : {}),
  };
}

export const ORDER_STATUSES = ["Menunggu", "Keep (Belum Bayar)", "Keep (Lunas)", "DP", "Siap Kirim", "Dikirim", "Dibatalkan"] as const;
export interface OrderItem { productId: string; customPrice?: number; discount: number }
export interface OrderPayload { customerId: string; products: OrderItem[]; shippingCost: number; courier: string; status: string; dpAmount: number; notes: string }

export function parseOrder(value: unknown): OrderPayload {
  const body = object(value);
  if (!Array.isArray(body.products) || body.products.length < 1 || body.products.length > 100) throw new CrmError("Pilih 1–100 tas.");
  const products = body.products.map(value => {
    const item = object(value);
    return {
      productId: text(item.productId, 200, "ID tas", true),
      ...(item.customPrice !== undefined ? { customPrice: money(item.customPrice, "Harga tas") } : {}),
      discount: money(item.discount ?? 0, "Diskon"),
    };
  }).sort((a, b) => a.productId.localeCompare(b.productId));
  if (new Set(products.map(p => p.productId)).size !== products.length) throw new CrmError("ID tas duplikat.");
  if (body.productIds !== undefined && (!Array.isArray(body.productIds) || body.productIds.length !== products.length ||
    new Set(body.productIds).size !== products.length || !products.every(p => (body.productIds as unknown[]).includes(p.productId)))) {
    throw new CrmError("Daftar ID tas tidak cocok.");
  }
  if (typeof body.status !== "string" || !ORDER_STATUSES.includes(body.status as typeof ORDER_STATUSES[number])) throw new CrmError("Status pesanan tidak valid.");
  return {
    customerId: text(body.customerId, 200, "Pelanggan", true), products,
    shippingCost: money(body.shippingCost ?? 0, "Ongkir"),
    courier: text(body.courier || body.shippingCourier || "JNE", 80, "Ekspedisi", true),
    status: body.status, dpAmount: money(body.dpAmount ?? 0, "DP"), notes: text(body.notes, 2000, "Catatan"),
  };
}
