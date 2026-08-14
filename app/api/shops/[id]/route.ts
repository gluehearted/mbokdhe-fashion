import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import path from "path";
import { unlink } from "fs/promises";

// PATCH /api/shops/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Nama Toko tidak boleh kosong." },
        { status: 400 }
      );
    }

    const cleanName = name.trim();

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: updated, error } = await supabase
      .from("shops")
      .update({ name: cleanName })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Nama toko berhasil diperbarui.",
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

// DELETE /api/shops/[id] - Menghapus toko beserta seluruh produk terkait (Cascade Delete)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // 1. Ambil seluruh produk yang terafiliasi dengan toko ini
    const { data: productsInShop, error: fetchProductsError } = await supabase
      .from("products")
      .select("id, photoUrl")
      .eq("shopId", id);

    if (fetchProductsError) throw fetchProductsError;

    // 2. Bersihkan file foto fisik dari Storage Supabase atau local storage
    if (productsInShop && productsInShop.length > 0) {
      for (const p of productsInShop) {
        if (p.photoUrl && !p.photoUrl.includes("placeholder")) {
          if (p.photoUrl.includes("supabase.co")) {
            try {
              const urlParts = p.photoUrl.split("/products/");
              if (urlParts.length > 1) {
                const filePath = urlParts[1];
                await supabase.storage.from("products").remove([filePath]);
              }
            } catch {
              // Ignore storage deletion errors
            }
          } else if (p.photoUrl.startsWith("/uploads/")) {
            try {
              const localPath = path.join(process.cwd(), "public", p.photoUrl);
              await unlink(localPath);
            } catch {
              // Ignore file removal errors
            }
          }
        }
      }

      // 3. Hapus seluruh produk yang berelasi dengan toko ini
      const { error: deleteProductsError } = await supabase
        .from("products")
        .delete()
        .eq("shopId", id);

      if (deleteProductsError) throw deleteProductsError;
    }

    // 4. Hapus toko dari database
    const { error: deleteShopError } = await supabase
      .from("shops")
      .delete()
      .eq("id", id);

    if (deleteShopError) throw deleteShopError;

    return NextResponse.json({
      success: true,
      message: `Toko dan ${productsInShop?.length || 0} produk terkait berhasil dihapus.`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
