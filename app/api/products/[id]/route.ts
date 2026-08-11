import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

// GET /api/products/[id]
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Produk tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
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
    const existing = await prisma.product.findUnique({
      where: { id },
    });

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
    let status: string | undefined;
    let photoUrl: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const originVal = formData.get("shopOrigin") as string;
      const capitalVal = formData.get("capitalPrice") as string;
      const priceVal = formData.get("price") as string;
      const statusVal = formData.get("status") as string;
      const file = formData.get("file") as File | null;

      if (originVal) shopOrigin = originVal;
      if (capitalVal) capitalPrice = parseInt(capitalVal, 10);
      if (priceVal) price = parseInt(priceVal, 10);
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
      status = body.status;
      photoUrl = body.photoUrl;
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(shopOrigin && { shopOrigin }),
        ...(capitalPrice !== undefined && !isNaN(capitalPrice) && { capitalPrice }),
        ...(price !== undefined && !isNaN(price) && { price }),
        ...(status && { status }),
        ...(photoUrl && { photoUrl }),
      },
    });

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
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { order: true },
    });

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

    await prisma.product.delete({
      where: { id },
    });

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
