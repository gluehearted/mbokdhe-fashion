import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

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
      const file = formData.get("file") as File | null;

      if (originVal) shopOrigin = originVal;
      if (capitalVal) capitalPrice = parseInt(capitalVal, 10);
      if (priceVal) price = parseInt(priceVal, 10);
      if (descVal !== null && descVal !== undefined) description = descVal.trim();
      if (statusVal) status = statusVal;

      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const fileExt = path.extname(file.name) || ".jpg";
        const fileName = `${id.replace(/[^a-zA-Z0-9_-]/g, "")}_${Date.now()}${fileExt}`;
        const uploadsDir = path.join(process.cwd(), "public", "uploads");

        await mkdir(uploadsDir, { recursive: true });
        const filePath = path.join(uploadsDir, fileName);
        await writeFile(filePath, buffer);
        photoUrl = `/uploads/${fileName}`;
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

    const { data: updated, error: updateError } = await supabase
      .from("products")
      .update({
        ...(capitalPrice !== undefined && !isNaN(capitalPrice) && { capitalPrice }),
        ...(price !== undefined && !isNaN(price) && { price }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(photoUrl && { photoUrl }),
      })
      .eq("id", id)
      .select()
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

    // Unlink photo file if local upload
    if (existing.photoUrl && existing.photoUrl.startsWith("/uploads/") && !existing.photoUrl.includes("placeholder")) {
      try {
        const localPath = path.join(process.cwd(), "public", existing.photoUrl);
        await unlink(localPath);
      } catch {
        // Ignore file removal errors
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
