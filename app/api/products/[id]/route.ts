import { NextResponse } from "next/server";
import { readForm } from "@/lib/crm/body";
import { failure, requireStaff } from "@/lib/crm/request";
import { MAX_BATCH_BYTES, CrmError, money, text } from "@/lib/crm/contracts";
import { POST as saveProductBatch } from "../batch/route";

// GET /api/products/[id]
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { supabase } = await requireStaff(request, request.method !== "GET");

    const { data: product, error } = await supabase
      .from("products")
      .select("*, order:orders(*, customer:customers(*))")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Produk tidak ditemukan." },
        { status: 404 }
      );
    }

    const order = Array.isArray(product.order) ? product.order[0] : product.order;
    const normalized = {
      ...product,
      order: order ? {
        ...order,
        customer: Array.isArray(order.customer) ? order.customer[0] : order.customer || null
      } : null
    };

    return NextResponse.json({
      success: true,
      data: normalized,
    });
  } catch (error) { return failure(error, "Operasi produk gagal. Silakan coba lagi."); }
}

// PATCH /api/products/[id] (Edit product)
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      await requireStaff(request);
      const source = await readForm(request, MAX_BATCH_BYTES);
      const draftId = (request.headers.get("idempotency-key") || crypto.randomUUID()).toLowerCase();
      const body = new FormData();
      const file = source.get("file");
      body.set("manifest", JSON.stringify({ editProductId: id, shopOrigin: source.get("shopOrigin"), capitalPrice: Number(source.get("capitalPrice") || 0), price: Number(source.get("price")), items: [{ draftId, description: String(source.get("description") || ""), hasPhoto: file instanceof File && file.size>0 }] }));
      if (file instanceof File && file.size>0) body.set(`photo:${draftId}`, file);
      const headers = new Headers(request.headers);
      headers.delete("content-type"); headers.delete("content-length");
      const response = await saveProductBatch(new Request(request.url, { method: "POST", headers, body }));
      const result = await response.json();
      return NextResponse.json(result.success ? { ...result, data: result.data[0] } : result, { status: response.status, headers: { "Cache-Control": "no-store" } });
    }


    const { supabase } = await requireStaff(request, request.method !== "GET");

    const { data: existing, error: checkError } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (checkError) throw checkError;

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Produk tidak ditemukan." },
        { status: 404 }
      );
    }

    if (existing.status === "Sold" || existing.status === "Terjual") {
      return NextResponse.json(
        { success: false, error: "Produk yang sudah berstatus 'Terjual' (Sold) tidak dapat diubah." },
        { status: 400 }
      );
    }

    let capitalPrice: number | undefined;
    let price: number | undefined;
    let description: string | undefined;
    let status: string | undefined;
    let photoUrl: string | undefined;

    const body = await request.json();
    const shopOrigin = body.shopOrigin === undefined ? undefined : text(body.shopOrigin, 120, "Supplier", true);
    if (body.capitalPrice !== undefined) capitalPrice = money(body.capitalPrice, "Harga modal");
    if (body.price !== undefined) price = money(body.price, "Harga jual", 1);
    if (body.description !== undefined) description = text(body.description, 2000, "Deskripsi");
    if (body.status !== undefined) {
      if (!["Tersedia", "Dibooking", "Terjual"].includes(body.status)) throw new CrmError("Status tas tidak valid.");
      status = body.status;
    }
    if (body.photoUrl !== undefined) {
      if (body.photoUrl !== existing.photoUrl && body.photoUrl !== "/uploads/placeholder.jpg") throw new CrmError("Gunakan unggahan foto dari form produk.");
      photoUrl = body.photoUrl;
    }

    // Resolusi shopId jika shopOrigin disediakan (Upsert)
    let shopId: string | undefined;
    if (shopOrigin) {
      const cleanShop = shopOrigin.trim();
      const { data: shopObj } = await supabase
        .from("shops")
        .upsert({ name: cleanShop }, { onConflict: "name" })
        .select("id")
        .single();
      if (shopObj) shopId = shopObj.id;
    }

    // Jika foto baru disediakan dan berbeda dari foto lama, hapus foto lama dari Supabase Storage (jika bukan placeholder)
    if (photoUrl && existing.photoUrl && existing.photoUrl !== photoUrl && !existing.photoUrl.includes("placeholder")) {
      try {
        let filePath: string | null = null;
        if (existing.photoUrl.includes("/storage/v1/object/public/products/")) {
          filePath = existing.photoUrl.split("/storage/v1/object/public/products/")[1];
        } else if (existing.photoUrl.includes("/products/")) {
          filePath = existing.photoUrl.split("/products/").pop() || null;
        }

        if (filePath) {
          await supabase.storage.from("products").remove([filePath]);
        }
      } catch {
        // Abaikan kesalahan penghapusan storage lama
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("products")
      .update({
        ...(capitalPrice !== undefined && !isNaN(capitalPrice) && { capitalPrice }),
        ...(price !== undefined && !isNaN(price) && { price }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(photoUrl && { photoUrl }),
        ...(shopId && { shopId }),
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*, shop:shops(*)")
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) { return failure(error, "Operasi produk gagal. Silakan coba lagi."); }
}

// DELETE /api/products/[id]
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { supabase } = await requireStaff(request, request.method !== "GET");

    const { data: existing, error: checkError } = await supabase
      .from("products")
      .select("*, order:orders(*)")
      .eq("id", id)
      .maybeSingle();

    if (checkError) throw checkError;

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Produk tidak ditemukan." },
        { status: 404 }
      );
    }

    if (existing.status === "Sold" || existing.status === "Terjual") {
      return NextResponse.json(
        { success: false, error: "Produk yang sudah terjual (Sold) tidak dapat dihapus." },
        { status: 400 }
      );
    }

    // Hapus file foto dari Supabase Storage jika bukan placeholder
    if (existing.photoUrl && !existing.photoUrl.includes("placeholder")) {
      try {
        let filePath: string | null = null;
        if (existing.photoUrl.includes("/storage/v1/object/public/products/")) {
          filePath = existing.photoUrl.split("/storage/v1/object/public/products/")[1];
        } else if (existing.photoUrl.includes("/products/")) {
          filePath = existing.photoUrl.split("/products/").pop() || null;
        }

        if (filePath) {
          await supabase.storage.from("products").remove([filePath]);
        }
      } catch {
        // Abaikan kesalahan penghapusan storage
      }
    }

    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      message: `Produk ID ${id} berhasil dihapus dari database.`,
    });
  } catch (error) { return failure(error, "Operasi produk gagal. Silakan coba lagi."); }
}
