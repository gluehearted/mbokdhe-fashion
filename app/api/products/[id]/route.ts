import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

// GET /api/products/[id]
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// PATCH /api/products/[id] (Edit product)
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

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

    if (existing.status === "Sold") {
      return NextResponse.json(
        { success: false, error: "Produk yang sudah berstatus 'Terjual' (Sold) tidak dapat diubah." },
        { status: 400 }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    let shopOrigin: string | undefined;
    let capitalPrice: number | undefined;
    let price: number | undefined;
    let description: string | undefined;
    let status: string | undefined;
    let photoUrl: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const originVal = formData.get("shopOrigin") as string;
      const capitalVal = formData.get("capitalPrice") as string;
      const priceVal = formData.get("price") as string;
      const descVal = formData.get("description") as string;
      const statusVal = formData.get("status") as string;
      const photoUrlVal = formData.get("photoUrl") as string;
      const file = formData.get("file") as File | null;

      if (originVal) shopOrigin = originVal;
      if (capitalVal) capitalPrice = parseInt(capitalVal, 10);
      if (priceVal) price = parseInt(priceVal, 10);
      if (descVal !== null && descVal !== undefined) description = descVal.trim();
      if (statusVal) status = statusVal;
      if (photoUrlVal) photoUrl = photoUrlVal;

      if (file && file.size > 0) {
        try {
          const bytes = await file.arrayBuffer();
          const fileExt = file.name.split(".").pop() || "jpg";
          const fileName = `${id.replace(/[^a-zA-Z0-9_-]/g, "")}-${Date.now()}.${fileExt}`;
          const filePath = `bags/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("products")
            .upload(filePath, bytes, {
              contentType: file.type,
              upsert: true,
            });

          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage
            .from("products")
            .getPublicUrl(filePath);

          if (publicUrlData?.publicUrl) {
            photoUrl = publicUrlData.publicUrl;
          }
        } catch (storageError: any) {
          console.error("Supabase server upload failed:", storageError.message);
          return NextResponse.json(
            {
              success: false,
              error: "Gagal mengunggah foto ke Supabase Storage.",
            },
            { status: 500 }
          );
        }
      }
    } else {
      const body = await request.json();
      shopOrigin = body.shopOrigin;
      if (body.capitalPrice !== undefined) capitalPrice = parseInt(String(body.capitalPrice), 10);
      if (body.price !== undefined) price = parseInt(String(body.price), 10);
      if (body.description !== undefined) description = String(body.description).trim();
      status = body.status;
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id]
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

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

    if (existing.status === "Sold") {
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
